// $NULL buyback & burn bot.
//
// Every EVERY_MINUTES: claims the creator's trading fees (WETH) from Stockpad's fee escrow,
// sets aside BURN_BPS of them, buys $NULL with that share through Stockpad's router and sends
// exactly the bought amount to the dead address. The rest of the fees stays in the wallet.
//
// Runs as a dry run (simulations only, nothing sent) until DRY_RUN=0. Amounts are taken from
// the transaction receipts, and every step is saved to state.json, so a crash or a dropped
// transaction never loses track of what is still owed to the burn.

import { existsSync, openSync, closeSync, readFileSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  formatEther,
  formatUnits,
  getAddress,
  http,
  parseAbi,
  parseEther,
  parseGwei,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

const HERE = dirname(fileURLToPath(import.meta.url))

// ── config ──────────────────────────────────────────────────────────────────

function loadEnv() {
  const file = join(HERE, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const env = (k, d) => process.env[k] ?? d
const CFG = {
  dryRun: env('DRY_RUN', '1') !== '0',
  readRpc: env('READ_RPC', 'https://ethereum-rpc.publicnode.com'),
  // private mempool, so the buyback can't be sandwiched
  sendRpc: env('SEND_RPC', 'https://rpc.flashbots.net/fast'),
  burnBps: BigInt(env('BURN_BPS', '5000')),
  everyMinutes: Number(env('EVERY_MINUTES', '20')),
  minClaim: parseEther(env('MIN_CLAIM_ETH', '0.01')),
  maxBuy: parseEther(env('MAX_BUY_ETH', '0.5')),
  slippageBps: BigInt(env('SLIPPAGE_BPS', '300')),
  maxGas: parseGwei(env('MAX_GWEI', '15')),
  gasReserve: parseEther(env('GAS_RESERVE_ETH', '0.003')),
}

// ── chain ───────────────────────────────────────────────────────────────────

const TOKEN = getAddress('0x51aAa1D6eb8aDFF4Dd73518b825Fc0fE56627160')
const WETH = getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
const ESCROW = getAddress('0xacefe251da006887da41c063d06cc82a060824ba')
const ROUTER = getAddress('0xcdf832d2c11da16055bb6c6145cf38edd7233767')
const HOOK = getAddress('0x322dcec4958c14e021a9f1cd49df11b9457968cc')
const DEAD = getAddress('0x000000000000000000000000000000000000dEaD')
const CREATOR = getAddress('0xe61C303A8796A838D08a4C864D6B7A455aB5C712')

// Stockpad pool: currencies sorted by address ($NULL < WETH), fee taken by the hook
const KEY = { currency0: TOKEN, currency1: WETH, fee: 0, tickSpacing: 200, hooks: HOOK }

const ABI = parseAbi([
  'function claimable(address account, address currency) view returns (uint256)',
  'function claim(address currency, address to) returns (uint256)',
  'event Claimed(address indexed account, address indexed currency, address to, uint256 amount)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function withdraw(uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function buyWethPairWithEth((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 minOut, bytes hookData) payable returns (uint256)',
])

const pub = createPublicClient({ chain: mainnet, transport: http(CFG.readRpc) })
const key = env('PRIVATE_KEY', '')
const account = key ? privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`) : null
const ME = account ? account.address : getAddress(env('ACCOUNT', CREATOR))
// transactions are prepared and signed against the read node, then only the signed bytes go to SEND_RPC
const signer = account ? createWalletClient({ account, chain: mainnet, transport: http(CFG.readRpc) }) : null
const sender = createPublicClient({ chain: mainnet, transport: http(CFG.sendRpc) })

// ── state & log ─────────────────────────────────────────────────────────────

const STATE_FILE = join(HERE, 'state.json')
const LOG_FILE = join(HERE, 'log.jsonl')

/** owed: ETH (wei) set aside for buybacks, not spent yet · unburned: bought $NULL not sent to dead yet */
function loadState() {
  const blank = { owed: '0', unburned: '0', pending: null, totals: { claimed: '0', spent: '0', burned: '0', runs: 0 } }
  try {
    return { ...blank, ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) }
  } catch {
    return blank
  }
}
const state = loadState()
const save = () => {
  if (!CFG.dryRun) writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}
const big = (s) => BigInt(s)

function log(msg, data = {}) {
  const line = { t: new Date().toISOString(), msg, ...data }
  console.log(`[${line.t}] ${msg}`, Object.keys(data).length ? data : '')
  if (!CFG.dryRun) appendFileSync(LOG_FILE, JSON.stringify(line) + '\n')
}
const eth = (wei) => `${Number(formatEther(wei)).toFixed(6)} ETH`
const nul = (wei) => `${Math.round(Number(formatUnits(wei, 18))).toLocaleString('en-US')} NULL`

// ── transactions ────────────────────────────────────────────────────────────

/** Sends a contract write, records it as pending, waits for the receipt (or leaves it pending). */
async function send(kind, request, extra = {}) {
  const prepared = await signer.prepareTransactionRequest({
    account,
    to: request.address,
    data: encodeFunctionData({ abi: request.abi, functionName: request.functionName, args: request.args }),
    value: request.value ?? 0n,
  })
  const serializedTransaction = await signer.signTransaction(prepared)
  const hash = await sender.sendRawTransaction({ serializedTransaction })
  state.pending = { kind, hash, at: Date.now(), ...extra }
  save()
  log(`sent ${kind}`, { hash })
  const rc = await pub.waitForTransactionReceipt({ hash, timeout: 300_000 }).catch(() => null)
  if (!rc) {
    log(`${kind} not mined yet, will check again next run`, { hash })
    return null
  }
  return settle(rc)
}

/** Applies a mined transaction to the state, using the amounts in its logs. */
function settle(rc) {
  const p = state.pending
  state.pending = null
  if (rc.status !== 'success') {
    log(`${p.kind} reverted`, { hash: rc.transactionHash })
    save()
    return null
  }
  const events = rc.logs.flatMap((l) => {
    try {
      return [{ address: getAddress(l.address), ...decodeEventLog({ abi: ABI, data: l.data, topics: l.topics }) }]
    } catch {
      return []
    }
  })
  if (p.kind === 'claim') {
    const ev = events.find((e) => e.eventName === 'Claimed' && e.address === ESCROW)
    const claimed = ev ? ev.args.amount : 0n
    const share = (claimed * CFG.burnBps) / 10_000n
    state.owed = (big(state.owed) + share).toString()
    state.totals.claimed = (big(state.totals.claimed) + claimed).toString()
    log('claimed', { claimed: eth(claimed), forBuyback: eth(share), owed: eth(big(state.owed)) })
  } else if (p.kind === 'buy') {
    const bought = events
      .filter((e) => e.eventName === 'Transfer' && e.address === TOKEN && getAddress(e.args.to) === ME)
      .reduce((n, e) => n + e.args.value, 0n)
    state.owed = (big(state.owed) - big(p.budget)).toString()
    state.unburned = (big(state.unburned) + bought).toString()
    state.totals.spent = (big(state.totals.spent) + big(p.budget)).toString()
    log('bought', { spent: eth(big(p.budget)), bought: nul(bought) })
  } else if (p.kind === 'burn') {
    state.unburned = (big(state.unburned) - big(p.amount)).toString()
    state.totals.burned = (big(state.totals.burned) + big(p.amount)).toString()
    log('burned', { amount: nul(big(p.amount)), hash: rc.transactionHash, totalBurned: nul(big(state.totals.burned)) })
  } else if (p.kind === 'unwrap') {
    log('unwrapped', { amount: eth(big(p.amount)) })
  }
  save()
  return rc
}

// ── one run ─────────────────────────────────────────────────────────────────

async function burnLeftovers() {
  const amount = big(state.unburned)
  if (amount <= 0n) return
  await send('burn', { address: TOKEN, abi: ABI, functionName: 'transfer', args: [DEAD, amount] }, { amount: amount.toString() })
}

async function run() {
  state.totals.runs++
  // a transaction from an earlier run that hadn't been mined
  if (state.pending) {
    const rc = await pub.getTransactionReceipt({ hash: state.pending.hash }).catch(() => null)
    if (rc) settle(rc)
    else if (Date.now() - state.pending.at > 30 * 60_000) {
      log(`${state.pending.kind} was dropped, carrying on`, { hash: state.pending.hash })
      state.pending = null
      save()
    } else return log('waiting for an earlier transaction', { hash: state.pending.hash })
  }

  const gas = await pub.getGasPrice()
  if (gas > CFG.maxGas) return log('gas too high, skipping', { gwei: formatUnits(gas, 9) })

  if (!CFG.dryRun) await burnLeftovers()

  // 1 · claim
  const claimable = await pub.readContract({ address: ESCROW, abi: ABI, functionName: 'claimable', args: [ME, WETH] })
  if (claimable >= CFG.minClaim) {
    if (CFG.dryRun) {
      const { result } = await pub.simulateContract({ account: ME, address: ESCROW, abi: ABI, functionName: 'claim', args: [WETH, ME] })
      log('[dry] would claim', { claimable: eth(result), forBuyback: eth((result * CFG.burnBps) / 10_000n) })
    } else {
      await send('claim', { address: ESCROW, abi: ABI, functionName: 'claim', args: [WETH, ME] })
      if (state.pending) return
    }
  } else log('fees below the minimum, not claiming yet', { claimable: eth(claimable), min: eth(CFG.minClaim) })

  // 2 · buy with the owed share
  let budget = CFG.dryRun ? (claimable * CFG.burnBps) / 10_000n : big(state.owed)
  if (budget > CFG.maxBuy) budget = CFG.maxBuy
  if (budget <= 0n) return log('nothing to buy back')

  if (!CFG.dryRun) {
    // unwrap as much WETH as the buy needs, keeping some ETH for gas
    const [ethBal, wethBal] = await Promise.all([
      pub.getBalance({ address: ME }),
      pub.readContract({ address: WETH, abi: ABI, functionName: 'balanceOf', args: [ME] }),
    ])
    const short = budget + CFG.gasReserve - ethBal
    if (short > 0n) {
      const amount = short < wethBal ? short : wethBal
      if (amount > 0n) {
        await send('unwrap', { address: WETH, abi: ABI, functionName: 'withdraw', args: [amount] }, { amount: amount.toString() })
        if (state.pending) return
      }
      const now = await pub.getBalance({ address: ME })
      if (now < budget + CFG.gasReserve) return log('not enough ETH for the buy and gas, waiting', { have: eth(now), need: eth(budget + CFG.gasReserve) })
    }
  }

  // quote by simulating the exact buy, then allow SLIPPAGE_BPS
  const { result: quoted } = await pub.simulateContract({
    account: ME,
    address: ROUTER,
    abi: ABI,
    functionName: 'buyWethPairWithEth',
    args: [KEY, 1n, '0x'],
    value: budget,
    ...(CFG.dryRun ? { stateOverride: [{ address: ME, balance: budget + parseEther('1') }] } : {}),
  })
  const minOut = (quoted * (10_000n - CFG.slippageBps)) / 10_000n
  if (CFG.dryRun) return log('[dry] would buy and burn', { spend: eth(budget), expect: nul(quoted), minOut: nul(minOut) })

  await send(
    'buy',
    { address: ROUTER, abi: ABI, functionName: 'buyWethPairWithEth', args: [KEY, minOut, '0x'], value: budget },
    { budget: budget.toString() },
  )
  if (state.pending) return
  // 3 · burn exactly what was bought
  await burnLeftovers()
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!CFG.dryRun && !account) throw new Error('PRIVATE_KEY is missing in buyback-bot/.env (or set DRY_RUN=1).')
  if (ME !== CREATOR) console.warn(`warning: ${ME} is not the $NULL creator wallet ${CREATOR}; it has no fees to claim.`)
  const lock = join(HERE, 'bot.lock')
  let fd
  try {
    fd = openSync(lock, 'wx')
  } catch {
    throw new Error('bot.lock exists: another bot is running. Delete buyback-bot/bot.lock if it is not.')
  }
  const release = () => {
    try {
      closeSync(fd)
      unlinkSync(lock)
    } catch {
      /* already gone */
    }
  }
  process.on('SIGINT', () => (release(), process.exit(0)))
  process.on('exit', release)

  log(CFG.dryRun ? 'buyback bot started (DRY RUN, nothing is sent)' : 'buyback bot started', {
    wallet: ME,
    burnShare: `${Number(CFG.burnBps) / 100}%`,
    everyMinutes: CFG.everyMinutes,
  })
  const once = process.argv.includes('--once')
  for (;;) {
    try {
      await run()
    } catch (e) {
      log('run failed', { error: e?.shortMessage ?? e?.message ?? String(e) })
    }
    if (once) break
    await new Promise((r) => setTimeout(r, CFG.everyMinutes * 60_000))
  }
  release()
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})

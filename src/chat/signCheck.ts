/**
 * Sign Check: what a transaction or signature request really does, decoded in the browser.
 *
 * Paste the data a wallet shows ("0x095ea7b3…") or an EIP-712 request (Permit, Permit2,
 * Seaport orders) and the common, risky cases are spelled out: who may spend which token, how
 * much, until when; all NFTs of a collection; a listing that pays you nothing. Nothing is
 * looked up online: names come from a short built-in list, everything else stays an address.
 * It says what a request does, never whether the site asking for it is honest.
 */

export type Level = 'danger' | 'warn' | 'info'

export interface SignResult {
  /** where in the text the request sits */
  start: number
  end: number
  kind: 'transaction' | 'signature'
  /** "approve(address,uint256)", "Permit2 · PermitSingle" … */
  method: string
  level: Level
  /** plain sentences, most important first */
  lines: string[]
}

// ── names we know (Ethereum mainnet, exact addresses only) ───────────────────

const TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18 },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 },
}

const CONTRACTS: Record<string, string> = {
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Uniswap Permit2',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap SwapRouter02',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': 'OpenSea Seaport 1.5',
  '0x0000000000000068f116a894984e2db1123eb395': 'OpenSea Seaport 1.6',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router v5',
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
/** an address with its name when we know it, else "unknown address 0x1234…abcd" */
const who = (a: string) => {
  const k = a.toLowerCase()
  return CONTRACTS[k] ? `${CONTRACTS[k]} (${short(a)})` : TOKENS[k] ? `${TOKENS[k].symbol} (${short(a)})` : `unknown address ${short(a)}`
}
const tokenName = (a: string) => TOKENS[a.toLowerCase()]?.symbol ?? `the token at ${short(a)}`
const known = (a: string) => !!CONTRACTS[a.toLowerCase()] || !!TOKENS[a.toLowerCase()]

const HUGE = 2n ** 128n
/** "250 USDC", "UNLIMITED USDC", "UNLIMITED of the token at 0x…", "1,000 raw units of this token" */
function amount(raw: bigint, token?: string): string {
  const t = token ? TOKENS[token.toLowerCase()] : undefined
  const of = t ? '' : token ? ` of the token at ${short(token)}` : ' of this token'
  if (raw >= HUGE) return t ? `UNLIMITED ${t.symbol}` : `UNLIMITED${of}`
  if (!t) return `${raw.toLocaleString('en-US')} raw units${of}`
  const d = 10n ** BigInt(t.decimals)
  const whole = raw / d
  const frac = (raw % d).toString().padStart(t.decimals, '0').slice(0, 4).replace(/0+$/, '')
  return `${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''} ${t.symbol}`
}

function when(seconds: bigint): { text: string; far: boolean } {
  if (seconds === 0n) return { text: 'no expiry set', far: true }
  if (seconds > 10_000_000_000n) return { text: 'never (no real expiry)', far: true }
  const ms = Number(seconds) * 1000
  const days = (ms - Date.now()) / 86_400_000
  return { text: `${new Date(ms).toISOString().slice(0, 10)}${days > 0 ? ` (in ${Math.round(days)} days)` : ' (already past)'}`, far: days > 365 }
}

// ── transactions (calldata) ──────────────────────────────────────────────────

const word = (data: string, i: number) => data.slice(i * 64, i * 64 + 64)
const asAddr = (w: string) => `0x${w.slice(24)}`
const asUint = (w: string) => BigInt(`0x${w || '0'}`)

function decodeCall(hex: string, to?: string): Omit<SignResult, 'start' | 'end' | 'kind'> | null {
  const sel = hex.slice(2, 10).toLowerCase()
  const d = hex.slice(10)
  const w = (i: number) => word(d, i)
  switch (sel) {
    case '095ea7b3': {
      const spender = asAddr(w(0))
      const v = asUint(w(1))
      if (v === 0n) return { method: 'approve(address,uint256)', level: 'info', lines: [`Removes the permission of ${who(spender)} to spend ${to ? tokenName(to) : 'this token'}.`] }
      return {
        method: 'approve(address,uint256)',
        level: v >= HUGE || !known(spender) ? 'danger' : 'warn',
        lines: [
          `Lets ${who(spender)} spend ${amount(v, to)} from your wallet, at any time, without asking again.`,
          ...(v >= HUGE ? ['Unlimited: everything you hold of it now and later.'] : []),
          ...(!known(spender) ? ['The spender is not a contract this list knows. Check it before you sign.'] : []),
        ],
      }
    }
    case '39509351': {
      const spender = asAddr(w(0))
      const v = asUint(w(1))
      return { method: 'increaseAllowance(address,uint256)', level: v >= HUGE || !known(spender) ? 'danger' : 'warn', lines: [`Lets ${who(spender)} spend ${amount(v, to)} more from your wallet.`] }
    }
    case 'a22cb465': {
      const operator = asAddr(w(0))
      const on = asUint(w(1)) !== 0n
      return on
        ? { method: 'setApprovalForAll(address,bool)', level: 'danger', lines: [`Lets ${who(operator)} move ALL your NFTs in this collection, now and later.`, 'Marketplaces ask for this; scam sites ask for it too.'] }
        : { method: 'setApprovalForAll(address,bool)', level: 'info', lines: [`Removes ${who(operator)}'s permission to move your NFTs in this collection.`] }
    }
    case 'a9059cbb':
      return { method: 'transfer(address,uint256)', level: 'warn', lines: [`Sends ${amount(asUint(w(1)), to)} to ${who(asAddr(w(0)))}.`] }
    case '23b872dd':
      return { method: 'transferFrom(address,address,uint256)', level: 'warn', lines: [`Moves ${amount(asUint(w(2)), to)} (or NFT #${asUint(w(2))}) from ${who(asAddr(w(0)))} to ${who(asAddr(w(1)))}.`] }
    case '42842e0e':
    case 'b88d4fde':
      return { method: 'safeTransferFrom(address,address,uint256)', level: 'warn', lines: [`Moves NFT #${asUint(w(2))} from ${who(asAddr(w(0)))} to ${who(asAddr(w(1)))}.`] }
    case 'd505accf': {
      const owner = asAddr(w(0))
      const spender = asAddr(w(1))
      const v = asUint(w(2))
      const dl = when(asUint(w(3)))
      return { method: 'permit(owner,spender,value,deadline,v,r,s)', level: 'danger', lines: [`Uses a signed permit: ${who(spender)} may spend ${amount(v, to)} of ${who(owner)}'s tokens, until ${dl.text}.`] }
    }
    case 'ac9650d8': {
      // multicall(bytes[]): list the calls inside
      const off = Number(asUint(w(0))) / 32
      const n = Number(asUint(w(off)))
      const inner: string[] = []
      for (let i = 0; i < Math.min(n, 8); i++) {
        const at = off + 1 + Number(asUint(w(off + 1 + i))) / 32
        const len = Number(asUint(w(at)))
        const call = `0x${d.slice((at + 1) * 64, (at + 1) * 64 + len * 2)}`
        const r = decodeCall(call, to)
        inner.push(r ? `${i + 1}. ${r.method}: ${r.lines[0]}` : `${i + 1}. unknown call ${call.slice(0, 10)}`)
      }
      return { method: `multicall · ${n} call${n === 1 ? '' : 's'}`, level: 'warn', lines: inner }
    }
    default:
      return null
  }
}

// ── signatures (EIP-712 typed data) ──────────────────────────────────────────

type Json = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint' ? String(v) : '')
const big = (v: unknown) => {
  try {
    return BigInt(str(v) || '0')
  } catch {
    return 0n
  }
}

function decodeTyped(j: Json): Omit<SignResult, 'start' | 'end' | 'kind'> | null {
  const primary = str(j.primaryType)
  const domain = (j.domain ?? {}) as Json
  const m = (j.message ?? {}) as Json
  const contract = str(domain.verifyingContract)
  const dname = str(domain.name)
  if (primary === 'Permit' && m.spender) {
    const v = big(m.value)
    const dl = when(big(m.deadline))
    return {
      method: `Permit · ${dname || 'token'}`,
      level: 'danger',
      lines: [
        `A signature, not a transaction: no gas, nothing shows in your wallet history. But it lets ${who(str(m.spender))} spend ${amount(v, contract)}${!TOKENS[contract.toLowerCase()] && dname ? ` (${dname})` : ''}, until ${dl.text}.`,
        ...(v >= HUGE ? ['Unlimited.'] : []),
        ...(dl.far ? ['The permission lasts a very long time.'] : []),
      ],
    }
  }
  if ((primary === 'PermitSingle' || primary === 'PermitBatch') && m.spender) {
    const details = (Array.isArray(m.details) ? m.details : [m.details]) as Json[]
    return {
      method: `Permit2 · ${primary}`,
      level: 'danger',
      lines: [
        ...details.map((x) => `Lets ${who(str(m.spender))} spend ${amount(big(x?.amount), str(x?.token))}, until ${when(big(x?.expiration)).text}.`),
        'Signed through Permit2: one signature can cover many tokens.',
      ],
    }
  }
  if (primary === 'OrderComponents' && Array.isArray(m.offer) && Array.isArray(m.consideration)) {
    const offerer = str(m.offerer).toLowerCase()
    const offer = m.offer as Json[]
    const cons = m.consideration as Json[]
    const toYou = cons.filter((c) => str(c.recipient).toLowerCase() === offerer)
    const itemKind = (t: unknown) => (['ETH', 'token', 'NFT', 'NFT', 'NFT (any in collection)', 'NFT (any in collection)'][Number(t)] ?? 'item')
    const describe = (x: Json) => {
      const kind = Number(x.itemType)
      if (kind === 0) return `${Number(big(x.startAmount)) / 1e18} ETH`
      if (kind === 1) return `${amount(big(x.startAmount), str(x.token))}`
      return `${itemKind(kind)} #${str(x.identifierOrCriteria)} of ${short(str(x.token))}`
    }
    const getNothing = toYou.length === 0 || toYou.every((c) => big(c.startAmount) === 0n)
    return {
      method: `Seaport listing · ${dname || 'OpenSea'}`,
      level: getNothing ? 'danger' : 'warn',
      lines: [
        `You give: ${offer.map(describe).join(', ') || 'nothing'}.`,
        getNothing ? 'You get: NOTHING. A listing that pays you nothing is how NFT drainers work.' : `You get: ${toYou.map(describe).join(', ')}.`,
      ],
    }
  }
  if (primary) {
    const addrs = [...new Set(JSON.stringify(m).match(/0x[0-9a-fA-F]{40}/g) ?? [])]
    return {
      method: `${primary}${dname ? ` · ${dname}` : ''}`,
      level: 'info',
      lines: [`A typed signature of the kind "${primary}"${contract ? ` for ${who(contract)}` : ''}.`, ...(addrs.length ? [`Addresses in it: ${addrs.slice(0, 4).map(who).join(', ')}.`] : [])],
    }
  }
  return null
}

/** Transactions and signature requests in `text`, decoded. */
export function checkSigning(text: string): SignResult[] {
  const out: SignResult[] = []
  // typed data: a JSON object with a primaryType somewhere in the text
  const open = text.indexOf('{')
  const close = text.lastIndexOf('}')
  if (open >= 0 && close > open && text.includes('primaryType')) {
    try {
      const j = JSON.parse(text.slice(open, close + 1)) as Json
      const r = decodeTyped(j)
      if (r) out.push({ ...r, start: open, end: close + 1, kind: 'signature' })
    } catch {
      /* not valid JSON: nothing to decode */
    }
  }
  // calldata: a selector plus whole 32-byte words; a "to: 0x…" nearby names the token
  for (const m of text.matchAll(/\b0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{64}){1,}\b/g)) {
    if (out.some((o) => m.index >= o.start && m.index < o.end)) continue
    const to = text.slice(0, m.index).match(/\b(?:to|contract|token)\b\W{0,6}(0x[0-9a-fA-F]{40})\b[^\n]*$/i)?.[1] ?? text.match(/\b(?:to|contract|token)\b\W{0,6}(0x[0-9a-fA-F]{40})\b/i)?.[1]
    const r = decodeCall(m[0], to)
    if (r) out.push({ ...r, start: m.index, end: m.index + m[0].length, kind: 'transaction' })
  }
  return out
}

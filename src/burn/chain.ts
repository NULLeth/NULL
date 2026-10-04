import { LIVE } from '../config/mode'
import { PROJECT } from '../config/project'

/**
 * Public, read-only view of $NULL's buyback & burn, straight from Ethereum:
 * the dead address's balance (RPC), the creator's unclaimed fees in Stockpad's
 * escrow (RPC), and the burn transfers sent from the creator wallet (Blockscout).
 */

const { ca } = PROJECT.token
const { creator, escrow, dead, weth } = PROJECT.burn
const BLOCKSCOUT = 'https://eth.blockscout.com/api/v2'

export const SEL = {
  balanceOf: '0x70a08231',
  transfer: '0xa9059cbb',
  claimable: '0xd4570c1c',
  claim: '0x21c0b342',
}

export const word = (hexAddr: string) => hexAddr.toLowerCase().replace(/^0x/, '').padStart(64, '0')
export const uintWord = (n: bigint) => n.toString(16).padStart(64, '0')

async function ethCall(to: string, data: string): Promise<bigint> {
  const res = await fetch(LIVE.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  })
  const j = (await res.json()) as { result?: string; error?: { message?: string } }
  if (!j.result) throw new Error(j.error?.message ?? 'RPC call failed')
  return BigInt(j.result === '0x' ? 0 : j.result)
}

export const tokenBalance = (token: string, holder: string) => ethCall(token, SEL.balanceOf + word(holder))
export const claimableWeth = (account: string = creator) => ethCall(escrow, SEL.claimable + word(account) + word(weth))

export interface Burn {
  hash: string
  ts: number
  amount: number
}

export interface BurnStats {
  /** $NULL held by the dead address (by anyone) */
  burned: number
  burnedPct: number
  /** creator fees waiting in Stockpad's escrow for the next buyback (ETH) */
  feesWaitingEth: number
  /** burns sent from the creator wallet, newest first */
  burns: Burn[]
  updatedAt: number
}

async function creatorBurns(): Promise<Burn[]> {
  const out: Burn[] = []
  let url = `${BLOCKSCOUT}/addresses/${creator}/token-transfers?type=ERC-20&filter=from&token=${ca}`
  for (let page = 0; page < 10; page++) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Blockscout returned ${res.status}`)
    const j = (await res.json()) as {
      items: { to: { hash: string }; total: { value: string; decimals: string }; timestamp: string; transaction_hash: string }[]
      next_page_params?: Record<string, string | number> | null
    }
    for (const t of j.items) {
      if (t.to.hash.toLowerCase() !== dead.toLowerCase()) continue
      out.push({ hash: t.transaction_hash, ts: Date.parse(t.timestamp), amount: Number(BigInt(t.total.value) / 10n ** 12n) / 1e6 })
    }
    if (!j.next_page_params) break
    url = `${BLOCKSCOUT}/addresses/${creator}/token-transfers?${new URLSearchParams(
      Object.entries({ type: 'ERC-20', filter: 'from', token: ca, ...j.next_page_params }).map(([k, v]) => [k, String(v)]),
    )}`
  }
  return out
}

export async function fetchBurnStats(): Promise<BurnStats> {
  const [deadBal, fees, burns] = await Promise.all([
    tokenBalance(ca, dead),
    claimableWeth(),
    creatorBurns().catch(() => [] as Burn[]),
  ])
  const burned = Number(deadBal / 10n ** 12n) / 1e6
  return {
    burned,
    burnedPct: (burned / PROJECT.token.supply) * 100,
    feesWaitingEth: Number(fees) / 1e18,
    burns,
    updatedAt: Date.now(),
  }
}

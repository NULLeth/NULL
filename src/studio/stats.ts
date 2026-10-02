import { LIVE } from '../config/mode'

/**
 * Public zkAPI usage, read from Ethereum mainnet: the vault's decoded events via
 * Blockscout (CORS-enabled, no key) and its ETH balance via public RPC.
 * Nothing here is NULL-specific — NULL keeps no usage data of its own.
 */
export interface ZkStats {
  /** all private notes ever created (deposits) */
  notes: number
  /** cooperative closes + finalized escapes */
  closed: number
  /** notes still open: the anonymity set new requests hide in */
  active: number
  depositedEth: number
  vaultEth: number
  new24h: number
  firstTs: number
  updatedAt: number
  /** cumulative notes over time, for the growth chart */
  series: { ts: number; notes: number }[]
}

interface Log {
  block_timestamp: string
  decoded?: { method_call?: string; parameters?: { name: string; value: string }[] }
}

const BLOCKSCOUT = 'https://eth.blockscout.com/api/v2'

async function vaultLogs(): Promise<Log[]> {
  const out: Log[] = []
  let url = `${BLOCKSCOUT}/addresses/${LIVE.vault}/logs`
  for (let page = 0; page < 40; page++) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Blockscout returned ${res.status}`)
    const json = (await res.json()) as { items: Log[]; next_page_params?: Record<string, string | number> | null }
    out.push(...json.items)
    if (!json.next_page_params) break
    url = `${BLOCKSCOUT}/addresses/${LIVE.vault}/logs?${new URLSearchParams(Object.entries(json.next_page_params).map(([k, v]) => [k, String(v)]))}`
  }
  return out
}

async function vaultBalanceEth(): Promise<number> {
  const res = await fetch(LIVE.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [LIVE.vault, 'latest'] }),
  })
  const j = (await res.json()) as { result?: string }
  return j.result ? Number(BigInt(j.result)) / 1e18 : 0
}

export async function fetchZkStats(): Promise<ZkStats> {
  const [logs, vaultEth] = await Promise.all([vaultLogs(), vaultBalanceEth()])
  const deposits: { ts: number; gwei: number }[] = []
  let closed = 0
  for (const l of logs) {
    const name = l.decoded?.method_call?.split('(')[0]
    const ts = Date.parse(l.block_timestamp)
    if (name === 'NoteDeposited') {
      const amount = l.decoded?.parameters?.find((p) => p.name === 'amount')?.value ?? '0'
      deposits.push({ ts, gwei: Number(amount) })
    } else if (name === 'MutualClose' || name === 'EscapeWithdrawalFinalized' || name === 'ExpiredClaimed') {
      closed++
    }
  }
  deposits.sort((a, b) => a.ts - b.ts)
  const now = Date.now()
  const series = deposits.map((d, i) => ({ ts: d.ts, notes: i + 1 }))
  return {
    notes: deposits.length,
    closed,
    active: Math.max(0, deposits.length - closed),
    depositedEth: deposits.reduce((s, d) => s + d.gwei, 0) / 1e9,
    vaultEth,
    new24h: deposits.filter((d) => now - d.ts < 86_400_000).length,
    firstTs: deposits[0]?.ts ?? now,
    updatedAt: now,
    series,
  }
}

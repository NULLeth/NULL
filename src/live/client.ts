import type { ZkClient } from '@openanonymity/zkapi-browser-sdk'
import { LIVE } from '../config/mode'

let pending: Promise<ZkClient> | null = null

/**
 * Loads and initializes the zkAPI browser SDK once. The SDK is code-split, so
 * demo visitors never download it. Initializing creates the proof worker and
 * reads the pinned mainnet deployment; it does not open a wallet prompt.
 */
export function loadZkapi(): Promise<ZkClient> {
  pending ??= (async () => {
    const sdk = await import('@openanonymity/zkapi-browser-sdk')
    sdk.configureBrowserSdk({ configUrl: '/zkapi/browser-config.json', workerUrl: '/zkapi/assets/zkapiWasmWorker.js' })
    await sdk.zkapiClient.init()
    return sdk.zkapiClient
  })().catch((err) => {
    pending = null
    throw err
  })
  return pending
}

/** gwei (the vault ledger unit) → ETH */
export const gweiToEth = (gwei: number) => gwei / 1e9

export function ethUsdFromQuote(q: { answer: string; decimals: number } | null | undefined): number | null {
  if (!q) return null
  return Number(q.answer) / 10 ** q.decimals
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(LIVE.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = (await res.json()) as { result?: string; error?: { message: string } }
  if (!json.result) throw new Error(json.error?.message ?? `${method} failed`)
  return json.result
}

/** Public vault facts for the stats band: deposits made so far and ETH held. */
export async function readVaultStats(): Promise<{ notes: number; ethLocked: number }> {
  const [next, bal] = await Promise.all([
    rpc('eth_call', [{ to: LIVE.vault, data: '0x7a2043a3' /* nextNoteId() */ }, 'latest']),
    rpc('eth_getBalance', [LIVE.vault, 'latest']),
  ])
  return { notes: parseInt(next, 16), ethLocked: Number(BigInt(bal)) / 1e18 }
}

/** Human message from anything the SDK or a wallet throws. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Something went wrong.'
  if (typeof err === 'string') return err
  const e = err as { code?: number; message?: string; shortMessage?: string }
  if (e.code === 4001) return 'Request rejected in the wallet.'
  return e.shortMessage || e.message || 'Something went wrong.'
}

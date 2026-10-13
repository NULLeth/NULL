import { useEffect, useState } from 'react'
import { vaultDeposits } from '../studio/stats'

/**
 * Your crowd: every request is paid with a zero-knowledge proof that some open note in the
 * zkAPI vault paid, not which one. How well that hides you depends on the crowd, which is
 * public on Ethereum: how many notes are open, how many deposits look like yours (size), and
 * how many were made on the same day as yours. Read from the vault's events via Blockscout.
 */

export interface CrowdData {
  /** every note ever deposited */
  notes: number
  /** notes not closed yet: the set a request could have come from */
  open: number
  deposits: { ts: number; gwei: number; exp: number }[]
  at: number
}

export type Level = 'good' | 'fair' | 'small'

let cache: { at: number; p: Promise<CrowdData> } | null = null

/** Loads the vault's deposits (cached for 5 minutes). */
export function loadCrowd(): Promise<CrowdData> {
  if (!cache || Date.now() - cache.at > 5 * 60_000) {
    const p = vaultDeposits().then(({ deposits, closed }) => ({ notes: deposits.length, open: Math.max(0, deposits.length - closed), deposits, at: Date.now() }))
    cache = { at: Date.now(), p }
    p.catch(() => (cache = null))
  }
  return cache.p
}

export function useCrowd(): { data: CrowdData | null; error: boolean } {
  const [state, setState] = useState<{ data: CrowdData | null; error: boolean }>({ data: null, error: false })
  useEffect(() => {
    let alive = true
    loadCrowd().then(
      (data) => alive && setState({ data, error: false }),
      () => alive && setState({ data: null, error: true }),
    )
    return () => {
      alive = false
    }
  }, [])
  return state
}

/** How many other deposits look like yours: a similar size (±25 %) and the same deposit day. Yours is not counted. */
export function yourCrowd(d: CrowdData, note: { depositEth: number; expiryTs: number }): { similar: number; sameDay: number } {
  const you = note.depositEth
  return {
    similar: Math.max(0, d.deposits.filter((x) => Math.abs(x.gwei / 1e9 - you) <= you * 0.25).length - 1),
    sameDay: Math.max(0, d.deposits.filter((x) => x.exp === note.expiryTs).length - 1),
  }
}

export const level = (n: number): Level => (n >= 20 ? 'good' : n >= 5 ? 'fair' : 'small')

/** Demo: the most recent real deposit in the vault stands in for "your note". */
export function demoNote(d: CrowdData): { depositEth: number; expiryTs: number; ts: number } | null {
  const last = d.deposits[d.deposits.length - 1]
  return last ? { depositEth: last.gwei / 1e9, expiryTs: last.exp, ts: last.ts } : null
}

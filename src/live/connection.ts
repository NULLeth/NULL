import { useEffect, useState } from 'react'

/**
 * Is this visitor on Tor? Asks NULL's own /api/connection (first party: the
 * same server that served the page), never a third-party service. One check per
 * page load, shared by everything that shows it; `check()` runs it again.
 */

export type Connection =
  | { status: 'idle' | 'checking' }
  | { status: 'done'; tor: boolean; ip: string | null }
  | { status: 'error' }

let state: Connection = { status: 'idle' }
const listeners = new Set<(c: Connection) => void>()

function set(next: Connection) {
  state = next
  listeners.forEach((l) => l(state))
}

export async function checkConnection(): Promise<void> {
  if (state.status === 'checking') return
  set({ status: 'checking' })
  try {
    const res = await fetch('/api/connection', { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(String(res.status))
    const j = (await res.json()) as { tor?: boolean; checked?: boolean; ip?: string | null }
    if (!j.checked) throw new Error('exit list unavailable')
    set({ status: 'done', tor: !!j.tor, ip: j.ip ?? null })
  } catch {
    set({ status: 'error' })
  }
}

/** Runs the check again now (or waits for the one in flight) and returns the result. */
export async function recheckConnection(): Promise<Connection> {
  if (state.status === 'checking')
    await new Promise<void>((resolve) => {
      const l = () => {
        if (state.status !== 'checking') {
          listeners.delete(l)
          resolve()
        }
      }
      listeners.add(l)
    })
  else await checkConnection()
  return state
}

export function useConnection(auto = true): Connection & { check: () => void } {
  const [c, setC] = useState(state)
  useEffect(() => {
    listeners.add(setC)
    if (auto && state.status === 'idle') void checkConnection()
    return () => {
      listeners.delete(setC)
    }
  }, [auto])
  return { ...c, check: () => void checkConnection() }
}

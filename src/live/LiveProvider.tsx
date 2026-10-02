import type { ZkClient, ZkSnapshot } from '@openanonymity/zkapi-browser-sdk'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { randId } from '../lib/random'
import type { ActivityEvent } from '../state/types'
import { errorMessage, ethUsdFromQuote, gweiToEth, loadZkapi, readVaultStats } from './client'

const LOG_KEY = 'null.live.log.v1'

export interface LiveState {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  hasNote: boolean
  balanceEth: number
  depositEth: number
  expiryTs: number | null
  pendingRequest: boolean
  ethUsd: number | null
  withdrawal: ZkSnapshot['withdrawal']
  /** latest in-progress SDK activity message, e.g. a recovering deposit */
  activity: string | null
  vault: { notes: number; ethLocked: number } | null
  /** this browser's own history; never leaves the device */
  log: ActivityEvent[]
}

interface LiveApi extends LiveState {
  client: () => Promise<ZkClient>
  addLog: (e: Omit<ActivityEvent, 'id' | 'ts'>) => void
  refresh: () => Promise<void>
}

const Ctx = createContext<LiveApi | null>(null)

function loadLog(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? (JSON.parse(raw) as ActivityEvent[]) : []
  } catch {
    return []
  }
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveState>(() => ({
    status: 'loading',
    error: null,
    hasNote: false,
    balanceEth: 0,
    depositEth: 0,
    expiryTs: null,
    pendingRequest: false,
    ethUsd: null,
    withdrawal: null,
    activity: null,
    vault: null,
    log: loadLog(),
  }))
  const clientRef = useRef<ZkClient | null>(null)

  const apply = useCallback((snap: ZkSnapshot, client: ZkClient) => {
    const note = snap.wallet?.note ?? null
    const running = snap.activities?.find((a) => !['ready', 'complete', 'completed', 'error', 'failed', 'canceled'].includes(a.phase))
    setState((s) => ({
      ...s,
      status: 'ready',
      error: null,
      hasNote: !!snap.wallet?.has_note,
      balanceEth: note ? gweiToEth(note.current_balance) : 0,
      depositEth: note ? gweiToEth(note.deposit_amount) : 0,
      expiryTs: note?.expiry_ts ?? null,
      pendingRequest: !!snap.wallet?.pending_request,
      ethUsd: ethUsdFromQuote(client.nativePriceQuote) ?? s.ethUsd,
      withdrawal: snap.withdrawal,
      activity: running?.message ?? null,
    }))
  }, [])

  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    loadZkapi()
      .then(async (client) => {
        if (cancelled) return
        clientRef.current = client
        unsub = client.subscribe((snap) => apply(snap, client))
        apply(client.snapshot(), client)
        // price for USD display (public Chainlink read, no wallet)
        try {
          const q = await client.refreshEthUsdPrice()
          setState((s) => ({ ...s, ethUsd: ethUsdFromQuote(q) }))
        } catch {
          /* price unavailable: USD shows as — */
        }
      })
      .catch((err) => !cancelled && setState((s) => ({ ...s, status: 'error', error: errorMessage(err) })))
    readVaultStats()
      .then((vault) => !cancelled && setState((s) => ({ ...s, vault })))
      .catch(() => {})
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [apply])

  useEffect(() => {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(state.log.slice(0, 100)))
    } catch {
      /* ignore */
    }
  }, [state.log])

  const addLog = useCallback<LiveApi['addLog']>((e) => {
    setState((s) => ({ ...s, log: [{ id: randId('evt', 8), ts: Date.now(), ...e }, ...s.log].slice(0, 100) }))
  }, [])

  const refresh = useCallback(async () => {
    const c = clientRef.current
    if (!c) return
    await c.refresh({ quiet: true })
    apply(c.snapshot(), c)
    readVaultStats()
      .then((vault) => setState((s) => ({ ...s, vault })))
      .catch(() => {})
  }, [apply])

  const api = useMemo<LiveApi>(() => ({ ...state, client: loadZkapi, addLog, refresh }), [state, addLog, refresh])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** Live zkAPI state, or null when the page runs in demo mode. */
export function useLive(): LiveApi | null {
  return useContext(Ctx)
}

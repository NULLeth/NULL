import { IS_LIVE } from '../config/mode'
import { ethToUsd } from '../lib/format'
import type { WalletInfo } from '../lib/wallet'
import { useNull } from '../state/store'
import type { ActivityEvent } from '../state/types'
import { useLive } from './LiveProvider'

export interface Account {
  live: boolean
  /** live: SDK still connecting / failed */
  status: 'loading' | 'ready' | 'error'
  error: string | null
  balanceEth: number
  balanceUsd: number | null
  hasNote: boolean
  expiryTs: number | null
  anonymitySet: number | null
  events: ActivityEvent[]
  wallet: WalletInfo | null
}

/** One view of "my balance" for components that render in both modes. */
export function useAccount(): Account {
  const { state } = useNull()
  const live = useLive()
  if (IS_LIVE && live) {
    return {
      live: true,
      status: live.status,
      error: live.error,
      balanceEth: live.balanceEth,
      balanceUsd: live.ethUsd != null ? live.balanceEth * live.ethUsd : null,
      hasNote: live.hasNote,
      expiryTs: live.expiryTs,
      anonymitySet: live.vault?.notes ?? null,
      events: live.log,
      // a demo wallet can't sign real transactions
      wallet: state.wallet?.kind === 'injected' ? state.wallet : null,
    }
  }
  return {
    live: false,
    status: 'ready',
    error: null,
    balanceEth: state.balanceEth,
    balanceUsd: ethToUsd(state.balanceEth),
    hasNote: state.notes.length > 0,
    expiryTs: null,
    anonymitySet: null,
    events: state.activity,
    wallet: state.wallet,
  }
}

import { useCallback, useMemo } from 'react'
import type { ServiceId } from '../protocol'
import { useNull } from './store'
import { scrollToId, useUi, type DashTab } from './ui'

/** High-level intents shared by every button that triggers them. */
export function useActions() {
  const { state } = useNull()
  const ui = useUi()
  const hasWallet = !!state.wallet

  const fund = useCallback(() => {
    ui.open(hasWallet ? { name: 'fund' } : { name: 'connect', then: 'fund' })
  }, [hasWallet, ui])

  const withdraw = useCallback(() => {
    ui.open(hasWallet ? { name: 'withdraw' } : { name: 'connect', then: 'withdraw' })
  }, [hasWallet, ui])

  const openService = useCallback((serviceId: ServiceId) => ui.open({ name: 'playground', serviceId }), [ui])
  const createAgent = useCallback(() => ui.open({ name: 'agent' }), [ui])

  const gotoDash = useCallback(
    (tab: DashTab) => {
      ui.setDashTab(tab)
      scrollToId('network')
    },
    [ui],
  )

  return useMemo(() => ({ fund, withdraw, openService, createAgent, gotoDash }), [fund, withdraw, openService, createAgent, gotoDash])
}

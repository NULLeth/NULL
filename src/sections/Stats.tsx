import { useEffect, useState } from 'react'
import { NetworkStat } from '../components/NetworkStat'
import { fmtCompactUsd, fmtInt } from '../lib/format'
import { networkSnapshot } from '../lib/network'
import { useNull } from '../state/store'
import { IS_LIVE, LIVE } from '../config/mode'
import { useLive } from '../live/LiveProvider'

export function Stats() {
  const { state } = useNull()
  const live = useLive()
  const [snap, setSnap] = useState(() => networkSnapshot())
  useEffect(() => {
    const t = setInterval(() => setSnap(networkSnapshot()), 3000)
    return () => clearInterval(t)
  }, [])

  // fold this browser's own private requests into the network count
  const mine = state.requests + state.agents.reduce((s, a) => s + a.requests, 0)

  return (
    <section aria-label="Network stats" className="relative border-t border-line">
      <div aria-hidden className="grid-bg absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)]" />
      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 border-x border-line lg:grid-cols-4 [&>*]:border-line [&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r max-lg:[&>*:nth-child(-n+2)]:border-b">
          {IS_LIVE ? (
            <>
              <NetworkStat index={0} label="PRIVATE NOTES" value={live?.vault?.notes ?? 0} format={fmtInt} note="deposits into the mainnet vault" />
              <NetworkStat index={1} label="ETH IN VAULT" value={live?.vault?.ethLocked ?? 0} format={(v) => v.toFixed(3)} note="read on-chain, live" />
              <NetworkStat index={2} label="NOTE LIFETIME" value={LIVE.noteTtlDays} format={(v) => `${Math.round(v)}d`} note="close before expiry" />
              <NetworkStat index={3} label="IDENTITIES EXPOSED" value={0} format={fmtInt} mark="*" note="billing identity" />
            </>
          ) : (
            <>
              <NetworkStat index={0} label="PRIVATE REQUESTS" value={snap.privateRequests + mine} format={fmtInt} note="+33k / 24h" />
              <NetworkStat index={1} label="VOLUME ROUTED" value={snap.volumeUsd} format={fmtCompactUsd} note="ETH-settled" />
              <NetworkStat index={2} label="ACTIVE SERVICES" value={snap.activeServices} format={fmtInt} note="AI · RPC · DATA · MEDIA" />
              <NetworkStat index={3} label="IDENTITIES EXPOSED" value={snap.identitiesExposed} format={fmtInt} mark="*" note="billing identity" />
            </>
          )}
        </div>
        <p className="border-x border-t border-line px-5 py-4 font-mono text-[10.5px] leading-relaxed text-dim sm:px-7">
          <span className="text-eth">*</span> Billing identity separation. Service providers may still receive request content and network metadata depending on
          configuration.{' '}
          {IS_LIVE
            ? 'Vault figures are read from Ethereum mainnet. The anonymity set is still small, so early privacy is limited.'
            : 'Figures shown are simulated for this demo.'}
        </p>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { NetworkStat } from '../components/NetworkStat'
import { fmtCompactUsd, fmtInt } from '../lib/format'
import { networkSnapshot } from '../lib/network'
import { useNull } from '../state/store'

export function Stats() {
  const { state } = useNull()
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
          <NetworkStat index={0} label="PRIVATE REQUESTS" value={snap.privateRequests + mine} format={fmtInt} note="+33k / 24h" />
          <NetworkStat index={1} label="VOLUME ROUTED" value={snap.volumeUsd} format={fmtCompactUsd} note="ETH-settled" />
          <NetworkStat index={2} label="ACTIVE SERVICES" value={snap.activeServices} format={fmtInt} note="AI · RPC · DATA · MEDIA" />
          <NetworkStat index={3} label="IDENTITIES EXPOSED" value={snap.identitiesExposed} format={fmtInt} mark="*" note="billing identity" />
        </div>
        <p className="border-x border-t border-line px-5 py-4 font-mono text-[10.5px] leading-relaxed text-dim sm:px-7">
          <span className="text-eth">*</span> Billing identity separation. Service providers may still receive request content and network metadata depending on
          configuration. Figures shown are simulated for this demo.
        </p>
      </div>
    </section>
  )
}

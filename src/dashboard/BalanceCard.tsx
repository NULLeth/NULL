import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import type { ReactNode } from 'react'
import { PrivacyIndicator } from '../components/PrivacyIndicator'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Button } from '../components/ui/Button'
import { ethToUsd, fmtEth, fmtInt, fmtUsd } from '../lib/format'
import { useNow } from '../lib/hooks'
import { networkSnapshot } from '../lib/network'
import { useActions } from '../state/actions'
import { allocatedToAgents, useNull } from '../state/store'

export function BalanceCard() {
  const { state } = useNull()
  const { fund, withdraw } = useActions()
  const now = useNow(8000)
  const inAgents = allocatedToAgents(state)

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-panel-2">
      {/* faint corner grid */}
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_80%_at_100%_0%,#000,transparent)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="label">PRIVATE BALANCE</div>
        <PrivacyIndicator
          variant="badge"
          label="IDENTITY SEPARATED"
          tip="This balance is a set of private notes. Spending from it proves you own one, without revealing which wallet funded it."
        />
      </div>

      <div className="relative px-5 pb-6 pt-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <AnimatedNumber
            value={state.balanceEth}
            format={(v) => fmtEth(v)}
            duration={1200}
            className="text-[44px] font-medium leading-none tracking-[-0.045em] text-fg sm:text-[56px]"
          />
          <span className="font-mono text-[15px] tracking-[0.08em] text-muted">ETH</span>
        </div>
        <div className="mt-3 font-mono text-[12px] text-dim">
          Approx. <AnimatedNumber value={ethToUsd(state.balanceEth)} format={(v) => fmtUsd(v)} flash={false} className="text-soft" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button variant="primary" onClick={fund} icon={<ArrowDownToLine className="size-3.5" />}>
            Fund
          </Button>
          <Button variant="secondary" onClick={withdraw} icon={<ArrowUpFromLine className="size-3.5" />} disabled={state.balanceEth <= 0}>
            Withdraw
          </Button>
        </div>
      </div>

      <dl className="relative mt-auto grid grid-cols-3 border-t border-line">
        {(
          [
            ['NOTES', String(state.notes.length)],
            [
              <>
                <span className="sm:hidden">ANON. SET</span>
                <span className="hidden sm:inline">ANONYMITY SET</span>
              </>,
              fmtInt(networkSnapshot(now).anonymitySet),
            ],
            ['IN AGENTS', `${fmtEth(inAgents)} ETH`],
          ] as [ReactNode, string][]
        ).map(([k, v], i) => (
          <div key={i} className={`min-w-0 px-4 py-4 sm:px-6 ${i < 2 ? 'border-r border-line' : ''}`}>
            <dt className="label truncate !text-[10px]">{k}</dt>
            <dd className="mt-1 truncate font-mono text-[13px] text-soft tnum">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

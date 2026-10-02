import { Pause, Play, Undo2 } from 'lucide-react'
import { ago, ethToUsd, fmtEth, fmtUsd } from '../lib/format'
import { useNow } from '../lib/hooks'
import type { Agent } from '../state/types'
import { CAPABILITY_LABEL } from '../state/types'
import { PrivacyIndicator } from './PrivacyIndicator'
import { AnimatedNumber } from './ui/AnimatedNumber'
import { Button } from './ui/Button'
import { CopyAddress } from './ui/CopyAddress'
import { StatusDot } from './ui/StatusDot'

export function AgentStatus({ status }: { status: Agent['status'] }) {
  const map = {
    active: { tone: 'ok' as const, text: 'ACTIVE', cls: 'text-ok/90' },
    paused: { tone: 'dim' as const, text: 'PAUSED', cls: 'text-muted' },
    depleted: { tone: 'warn' as const, text: 'BUDGET SPENT', cls: 'text-warn' },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] ${map.cls}`}>
      <StatusDot tone={map.tone} live={status === 'active'} />
      {map.text}
    </span>
  )
}

export function AgentCard({ agent, onToggle, onRecall }: { agent: Agent; onToggle: () => void; onRecall: () => void }) {
  const now = useNow()
  const pct = agent.initialBudgetEth > 0 ? Math.max(0, Math.min(1, agent.budgetEth / agent.initialBudgetEth)) : 0
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-panel/80 transition-colors hover:border-line-2">
      {/* scan line when active */}
      {agent.status === 'active' && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="h-px w-1/3 animate-[scan_3.2s_linear_infinite] bg-linear-to-r from-transparent via-ok/60 to-transparent" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="truncate font-mono text-[15px] font-semibold tracking-[0.2em] text-fg">{agent.name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="label !text-[10px]">KEY</span>
            <CopyAddress value={agent.agentKey} head={6} tail={4} label="agent key" className="!text-[11px] !text-muted" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="label !text-[10px]">STATUS</span>
          <AgentStatus status={agent.status} />
        </div>
      </div>

      <div className="mt-5 px-5">
        <div className="label !text-[10px]">PRIVATE BUDGET</div>
        <div className="mt-1 flex items-baseline gap-2">
          <AnimatedNumber value={agent.budgetEth} format={(v) => fmtEth(v)} flash={false} className="text-[24px] font-medium tracking-[-0.02em] text-fg" />
          <span className="font-mono text-[12px] text-muted">ETH</span>
          <span className="ml-auto font-mono text-[11.5px] text-dim tnum">≈ {fmtUsd(ethToUsd(agent.budgetEth), { cents: true })}</span>
        </div>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${agent.status === 'depleted' ? 'bg-warn/70' : 'bg-soft/80'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 border-y border-line">
        <div className="px-5 py-3">
          <dt className="label !text-[10px]">REQUESTS</dt>
          <dd className="mt-1 font-mono text-[14px] text-fg tnum">{agent.requests.toLocaleString('en-US')}</dd>
        </div>
        <div className="border-x border-line px-4 py-3">
          <dt className="label !text-[10px]">SPENT</dt>
          <dd className="mt-1 font-mono text-[14px] text-fg tnum">{fmtUsd(agent.spentUsd, { cents: true })}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="label !text-[10px]">PRIVACY</dt>
          <dd className="mt-1">
            <PrivacyIndicator label="ENABLED" tip="The agent spends from its own note. Providers can't link its requests to you or to each other." />
          </dd>
        </div>
      </dl>

      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map((c) => (
            <span key={c} className="rounded-[4px] border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-muted">
              {CAPABILITY_LABEL[c].toUpperCase()}
            </span>
          ))}
        </div>
        <div className="mt-3 min-h-[18px] truncate font-mono text-[11.5px] text-dim">
          <span className="text-faint">›</span> {agent.lastTask}
          {agent.lastTs ? <span className="text-faint"> · {ago(agent.lastTs, now)}</span> : null}
        </div>
        <div className="mt-auto flex gap-2 pt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggle}
            disabled={agent.status === 'depleted'}
            icon={agent.status === 'active' ? <Pause className="size-3" /> : <Play className="size-3" />}
            className="flex-1"
          >
            {agent.status === 'active' ? 'Pause' : 'Resume'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onRecall} icon={<Undo2 className="size-3" />} className="flex-1">
            Recall
          </Button>
        </div>
      </div>
    </article>
  )
}

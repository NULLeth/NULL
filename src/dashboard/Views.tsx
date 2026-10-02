import { Pause, Play, Plus, Undo2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { ActivityTable } from '../components/ActivityFeed'
import { AgentStatus } from '../components/AgentCard'
import { ServiceRow } from '../components/ServiceCard'
import { Button } from '../components/ui/Button'
import { FilterChips } from '../components/ui/FilterChips'
import { fmtEth, fmtUsd } from '../lib/format'
import { GROUP_LABEL, MORE_ROUTES, SERVICES, type ServiceGroup } from '../protocol'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { CAPABILITY_LABEL } from '../state/types'

function ViewHeader({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="font-mono text-[13px] tracking-[0.16em] text-fg">{title}</h3>
        <p className="mt-1 text-[13.5px] text-muted">{sub}</p>
      </div>
      {children}
    </div>
  )
}

export function ServicesView() {
  const { openService } = useActions()
  const [group, setGroup] = useState<'all' | ServiceGroup>('all')
  const list = SERVICES.filter((s) => group === 'all' || s.group === group)
  return (
    <div>
      <ViewHeader title="SERVICES" sub="Every route bills your private balance per request. No keys, no accounts.">
        <FilterChips
          value={group}
          onChange={setGroup}
          options={[{ value: 'all', label: 'ALL' }, ...(Object.keys(GROUP_LABEL) as ServiceGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))]}
        />
      </ViewHeader>
      <div className="overflow-hidden rounded-lg border border-line bg-panel-2">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_88px_minmax(0,1.1fr)_auto] gap-x-4 border-b border-line px-5 py-2.5 md:grid">
          {['SERVICE', 'PRICE', 'STATUS', 'BILLING', ''].map((h, i) => (
            <span key={i} className="label !text-[10px]">
              {h}
            </span>
          ))}
        </div>
        {list.map((s) => (
          <ServiceRow key={s.id} svc={s} onUse={() => openService(s.id)} />
        ))}
      </div>
      <p className="mt-4 font-mono text-[11px] leading-relaxed text-dim">
        ALSO ON THE ROUTER · <span className="text-muted">{MORE_ROUTES.join(' · ')}</span>
      </p>
    </div>
  )
}

export function AgentsView() {
  const { state, toggleAgent, recallAgent } = useNull()
  const { createAgent } = useActions()
  const { toast } = useUi()
  return (
    <div>
      <ViewHeader title="MY AGENTS" sub="Each agent spends from its own private budget, with its own key.">
        <Button size="sm" variant="primary" onClick={createAgent} icon={<Plus className="size-3.5" />}>
          Deploy agent
        </Button>
      </ViewHeader>
      <div className="overflow-hidden rounded-lg border border-line bg-panel-2">
        {state.agents.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="max-w-[360px] text-[14px] text-muted">No agents yet. Give one a budget and a scope, and watch it work without your identity.</p>
            <Button size="sm" variant="secondary" onClick={createAgent} icon={<Plus className="size-3.5" />}>
              Create agent
            </Button>
          </div>
        )}
        {state.agents.map((a) => {
          const pct = a.initialBudgetEth ? a.budgetEth / a.initialBudgetEth : 0
          return (
            <div
              key={a.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-3 border-b border-line px-4 py-4 last:border-b-0 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_90px_auto]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-semibold tracking-[0.18em] text-fg">{a.name}</span>
                  <AgentStatus status={a.status} />
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-dim">{a.capabilities.map((c) => CAPABILITY_LABEL[c]).join(' · ')}</div>
              </div>
              <div className="order-last col-span-2 min-w-0 lg:order-none lg:col-span-1">
                <div className="flex items-baseline justify-between font-mono text-[11.5px]">
                  <span className="text-soft tnum">{fmtEth(a.budgetEth)} ETH</span>
                  <span className="text-dim tnum">of {fmtEth(a.initialBudgetEth)}</span>
                </div>
                <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full transition-[width] duration-700 ${a.status === 'depleted' ? 'bg-warn/70' : 'bg-soft/80'}`} style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
              <div className="hidden font-mono text-[11.5px] lg:block">
                <div className="text-soft tnum">{a.requests} req</div>
                <div className="text-dim tnum">{fmtUsd(a.spentUsd, { cents: true })}</div>
              </div>
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleAgent(a.id)}
                  disabled={a.status === 'depleted'}
                  aria-label={a.status === 'active' ? `Pause ${a.name}` : `Resume ${a.name}`}
                  icon={a.status === 'active' ? <Pause className="size-3" /> : <Play className="size-3" />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    recallAgent(a.id)
                    toast(`${a.name} recalled · ${fmtEth(a.budgetEth)} ETH returned to your private balance`)
                  }}
                  aria-label={`Recall ${a.name}`}
                  icon={<Undo2 className="size-3" />}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ActFilter = 'all' | 'you' | 'agents' | 'funds'

export function ActivityView() {
  const { state } = useNull()
  const [f, setF] = useState<ActFilter>('all')
  const events = useMemo(
    () =>
      state.activity.filter((e) => {
        if (f === 'you') return e.kind === 'request'
        if (f === 'agents') return e.kind === 'agent' || e.kind === 'deploy' || e.kind === 'recall'
        if (f === 'funds') return e.kind === 'deposit' || e.kind === 'withdraw'
        return true
      }),
    [state.activity, f],
  )
  return (
    <div>
      <ViewHeader title="ACTIVITY" sub="Every spend carries its own nullifier. None of them carry your wallet.">
        <FilterChips
          value={f}
          onChange={setF}
          options={[
            { value: 'all', label: 'ALL' },
            { value: 'you', label: 'YOU' },
            { value: 'agents', label: 'AGENTS' },
            { value: 'funds', label: 'FUNDS' },
          ]}
        />
      </ViewHeader>
      <div className="max-h-[520px] overflow-y-auto rounded-lg border border-line bg-panel-2">
        <ActivityTable events={events.slice(0, 60)} />
      </div>
    </div>
  )
}

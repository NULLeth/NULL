import { ArrowRight, Bot, Check, MessageSquareText } from 'lucide-react'
import type { ReactNode } from 'react'
import { ActivityFeed } from '../components/ActivityFeed'
import { Button } from '../components/ui/Button'
import { CopyAddress } from '../components/ui/CopyAddress'
import { ago } from '../lib/format'
import { useNow } from '../lib/hooks'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { BalanceCard } from './BalanceCard'
import { SpendBreakdown } from './SpendBreakdown'

function AccessCard() {
  const { state } = useNull()
  const { openService, createAgent } = useActions()
  const now = useNow()
  const lastProof = state.activity.find((e) => (e.kind === 'request' || e.kind === 'agent') && e.ref)
  const activeAgents = state.agents.filter((a) => a.status === 'active').length

  const rows: [string, ReactNode][] = [
    [
      'API KEYS ON FILE',
      <span className="inline-flex items-center gap-1.5 text-ok">
        NONE <Check className="size-3" strokeWidth={2.6} />
      </span>,
    ],
    [
      'BILLING ACCOUNTS',
      <span className="inline-flex items-center gap-1.5 text-ok">
        NONE <Check className="size-3" strokeWidth={2.6} />
      </span>,
    ],
    ['ACTIVE AGENTS', <span className="text-soft">{activeAgents}</span>],
    [
      'LAST PROOF',
      lastProof?.ref ? (
        <span className="inline-flex items-center gap-2">
          <CopyAddress value={lastProof.ref} head={6} tail={4} label="proof reference" className="!text-[12px]" />
          <span className="text-dim">{ago(lastProof.ts, now)}</span>
        </span>
      ) : (
        <span className="text-dim">—</span>
      ),
    ],
  ]

  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-panel-2">
      <div className="border-b border-line px-5 py-3.5">
        <span className="label">ACCESS</span>
      </div>
      <dl className="flex-1 px-5 py-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-line py-2.5 font-mono text-[12px] last:border-b-0">
            <dt className="text-[10.5px] tracking-[0.12em] text-dim">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
        <Button size="sm" variant="secondary" onClick={() => openService('claude')} icon={<MessageSquareText className="size-3.5" />}>
          Playground
        </Button>
        <Button size="sm" variant="secondary" onClick={createAgent} icon={<Bot className="size-3.5" />}>
          New agent
        </Button>
      </div>
    </div>
  )
}

export function Overview() {
  const { state } = useNull()
  const { setDashTab } = useUi()
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <BalanceCard />
        <AccessCard />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SpendBreakdown events={state.activity} />
        <div className="flex flex-col rounded-lg border border-line bg-panel-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
            <span className="label">RECENT ACTIVITY</span>
            <button
              type="button"
              onClick={() => setDashTab('activity')}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-[10.5px] tracking-[0.12em] text-muted transition-colors hover:text-fg"
            >
              VIEW ALL <ArrowRight className="size-3" />
            </button>
          </div>
          <ActivityFeed events={state.activity} limit={6} compact />
        </div>
      </div>
    </div>
  )
}

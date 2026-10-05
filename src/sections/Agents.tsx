import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { ActivityFeed } from '../components/ActivityFeed'
import { AgentCard } from '../components/AgentCard'
import { SectionHeader } from '../components/SectionHeader'
import { Button } from '../components/ui/Button'
import { StatusDot } from '../components/ui/StatusDot'
import { fmtEth, fmtUsd } from '../lib/format'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'

function NewAgentTile({ onClick, tall }: { onClick: () => void; tall: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line-2 bg-transparent px-6 text-center transition-colors hover:border-line-3 hover:bg-white/[0.015] ${tall ? 'min-h-[380px]' : 'min-h-[220px]'}`}
    >
      <span className="inline-flex size-10 items-center justify-center rounded-full border border-line-2 text-muted transition-colors group-hover:border-line-3 group-hover:text-fg">
        <Plus className="size-4" />
      </span>
      <span>
        <span className="block font-mono text-[11.5px] tracking-[0.16em] text-soft">CREATE AGENT</span>
        <span className="mt-1.5 block max-w-[240px] text-[13px] leading-snug text-dim">A name, a budget, a scope. It gets a key you can revoke and nothing else.</span>
      </span>
    </button>
  )
}

export function Agents() {
  const { state, toggleAgent, recallAgent } = useNull()
  const { createAgent } = useActions()
  const { toast } = useUi()

  const agentEvents = useMemo(() => state.activity.filter((e) => e.kind === 'agent' || e.kind === 'deploy' || e.kind === 'recall'), [state.activity])
  const active = state.agents.filter((a) => a.status === 'active').length
  const spent = state.agents.reduce((s, a) => s + a.spentUsd, 0)

  return (
    <section id="agents" className="relative scroll-mt-16 border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="04"
          eyebrow="PRIVATE AGENTS"
          title={
            <>
              Give machines a budget <span className="text-muted">without giving them your identity.</span>
            </>
          }
          sub="Demo: agents here are simulated in your browser. On the live site, real agents run with the NULL Agent Kit: a key and a daily budget per agent, paid privately through zkAPI."

          aside={
            <Button variant="primary" onClick={createAgent} icon={<Plus className="size-4" />}>
              Create agent
            </Button>
          }
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className={`grid content-start gap-5 ${state.agents.length ? 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : ''}`}>
            <AnimatePresence initial={false}>
              {state.agents.map((a) => (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AgentCard
                    agent={a}
                    onToggle={() => toggleAgent(a.id)}
                    onRecall={() => {
                      recallAgent(a.id)
                      toast(`${a.name} recalled · ${fmtEth(a.budgetEth)} ETH returned to your private balance`)
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {state.agents.length < 4 && (
              <motion.div layout>
                <NewAgentTile onClick={createAgent} tall={state.agents.length % 2 === 1} />
              </motion.div>
            )}
          </div>

          <div className="flex min-h-[480px] flex-col overflow-hidden rounded-lg border border-line-2 bg-panel lg:sticky lg:top-24 lg:max-h-[640px] lg:self-start">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <span className="label text-muted">LIVE AGENT ACTIVITY</span>
              <span className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] ${active ? 'text-ok/90' : 'text-dim'}`}>
                <StatusDot tone={active ? 'ok' : 'dim'} live={active > 0} />
                {active ? 'STREAMING' : 'IDLE'}
              </span>
            </div>
            <div className="grid grid-cols-3 border-b border-line font-mono">
              {[
                ['AGENTS', `${active}/${state.agents.length}`],
                ['REQUESTS', state.agents.reduce((s, a) => s + a.requests, 0).toLocaleString('en-US')],
                ['SPENT', fmtUsd(spent, { cents: true })],
              ].map(([k, v], i) => (
                <div key={k} className={`px-5 py-3 ${i < 2 ? 'border-r border-line' : ''}`}>
                  <div className="label !text-[9.5px]">{k}</div>
                  <div className="mt-0.5 text-[13px] text-soft tnum">{v}</div>
                </div>
              ))}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <ActivityFeed events={agentEvents} limit={9} emptyText="Deploy an agent to see it work." />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-panel to-transparent" />
            </div>
            <div className="border-t border-line px-5 py-3 font-mono text-[10.5px] leading-relaxed text-dim">
              Each line is paid by its own proof. None of them link to each other or to you.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Activity, Bot, LayoutGrid, RotateCcw, Waypoints } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusDot } from '../components/ui/StatusDot'
import { Tooltip } from '../components/ui/Tooltip'
import { WalletButton } from '../components/WalletButton'
import { PROJECT } from '../config/project'
import { fmtInt } from '../lib/format'
import { useNow } from '../lib/hooks'
import { estimatedHead } from '../protocol/responses'
import { SERVICES } from '../protocol'
import { useNull } from '../state/store'
import { useUi, type DashTab } from '../state/ui'
import { IS_LIVE } from '../config/mode'
import { Overview } from './Overview'
import { ActivityView, AgentsView, ServicesView } from './Views'

const TABS: { id: DashTab; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'OVERVIEW', icon: LayoutGrid },
  { id: 'services', label: 'SERVICES', icon: Waypoints },
  { id: 'agents', label: 'MY AGENTS', icon: Bot },
  { id: 'activity', label: 'ACTIVITY', icon: Activity },
]

function NetworkStatus({ className = '' }: { className?: string }) {
  const now = useNow(4000)
  return (
    <div className={`font-mono ${className}`}>
      <div className="label !text-[10px]">NETWORK STATUS</div>
      <div className="mt-1.5 flex items-center gap-2 text-[11.5px] tracking-[0.12em] text-ok/90">
        <StatusDot tone="ok" live />
        OPERATIONAL
      </div>
      <div className="mt-3 space-y-1 text-[10.5px] text-dim">
        <div className="flex justify-between gap-2">
          <span>BLOCK</span>
          <span className="text-muted tnum">#{fmtInt(estimatedHead(now))}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>VERIFIER</span>
          <span className="text-muted">groth16 · 3.1ms</span>
        </div>
      </div>
    </div>
  )
}

/** One-time "boot" sweep when the console first scrolls into view. */
function BootOverlay({ show }: { show: boolean }) {
  const lines = ['resolving private session', 'loading notes from this device', 'verifier handshake']
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-panel/95 backdrop-blur-sm"
        >
          <div className="w-[300px] font-mono text-[12px]">
            {lines.map((l, i) => (
              <motion.div
                key={l}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.22 }}
                className="flex justify-between py-1"
              >
                <span className="text-muted">› {l}</span>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.22 + 0.18 }} className="text-ok">
                  ok
                </motion.span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Dashboard() {
  const { state, reset } = useNull()
  const { dashTab, setDashTab, toast } = useUi()
  const frame = useRef<HTMLDivElement>(null)
  const inView = useInView(frame, { once: true, margin: '-120px' })
  const [booting, setBooting] = useState(false)
  const booted = useRef(false)

  useEffect(() => {
    if (!inView || booted.current) return
    booted.current = true
    setBooting(true)
    const t = setTimeout(() => setBooting(false), 1050)
    return () => clearTimeout(t)
  }, [inView])

  const counts: Partial<Record<DashTab, string>> = {
    services: String(SERVICES.length),
    agents: String(state.agents.length),
  }

  return (
    <section id="network" className="relative scroll-mt-16 border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="02"
          eyebrow="NETWORK"
          title={
            <>
              One private balance.
              <br />
              <span className="text-muted">Every API.</span>
            </>
          }
          sub="Fund once from any wallet. Spend from a balance that isn't linked to it, yourself or through your agents."
        />

        <motion.div
          ref={frame}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-14 overflow-hidden rounded-xl border border-line-2 bg-panel shadow-[0_60px_140px_-60px_rgb(0_0_0/0.95)]"
        >
          <BootOverlay show={booting} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent" />

          {/* window bar */}
          <div className="flex h-12 items-center gap-4 border-b border-line px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 font-mono text-[11.5px] text-dim">
              <span className="text-soft">{PROJECT.domain}</span>
              <span className="text-faint">/</span>
              <span>app</span>
              <span className="text-faint">/</span>
              <span className="truncate text-muted">{dashTab}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {IS_LIVE ? (
                <Tooltip content="Real zkAPI on Ethereum mainnet via the Open Anonymity deployment. The protocol is experimental and unaudited: keep amounts small.">
                  <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-ok/25 bg-ok/[0.06] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ok/90">
                    <StatusDot tone="ok" live /> MAINNET · LIVE
                  </span>
                </Tooltip>
              ) : (
                <Tooltip content="The protocol backend is simulated in this build. Nothing is sent on-chain and responses come from a demo router.">
                  <span className="rounded-[4px] border border-warn/25 bg-warn/[0.06] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-warn/90">
                    DEMO MODE
                  </span>
                </Tooltip>
              )}
              {!IS_LIVE && <span className="hidden font-mono text-[11px] text-dim lg:inline">{state.sessionId}</span>}
              <div className="hidden sm:block">
                <WalletButton />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[208px_minmax(0,1fr)]">
            {/* sidebar */}
            <aside className="flex flex-col border-b border-line md:border-b-0 md:border-r">
              <nav className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] md:flex-col md:gap-0.5 md:p-3" aria-label="Dashboard">
                {TABS.map((t) => {
                  const on = dashTab === t.id
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDashTab(t.id)}
                      className={`relative flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left font-mono text-[11px] tracking-[0.12em] transition-colors ${
                        on ? 'text-fg' : 'text-dim hover:bg-white/[0.025] hover:text-soft'
                      }`}
                    >
                      {on && <motion.span layoutId="dash-tab" className="absolute inset-0 rounded-md border border-line-2 bg-white/[0.045]" transition={{ type: 'spring', stiffness: 500, damping: 42 }} />}
                      <Icon className="relative size-3.5" strokeWidth={1.7} />
                      <span className="relative">{t.label}</span>
                      {counts[t.id] && <span className="relative ml-auto pl-2 text-[10px] text-faint">{counts[t.id]}</span>}
                      {t.id === 'activity' && (
                        <span className="relative ml-auto pl-2">
                          <StatusDot tone="ok" live />
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
              <div className="mt-auto hidden border-t border-line p-4 md:block">
                <NetworkStatus />
                <button
                  type="button"
                  hidden={IS_LIVE}
                  onClick={() => {
                    reset()
                    setDashTab('overview')
                    toast('Demo state reset', 'info')
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-faint transition-colors hover:text-muted"
                >
                  <RotateCcw className="size-3" />
                  RESET DEMO
                </button>
              </div>
            </aside>

            {/* main */}
            <div className="min-w-0 p-3 sm:p-5 lg:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={dashTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {dashTab === 'overview' && <Overview />}
                  {dashTab === 'services' && <ServicesView />}
                  {dashTab === 'agents' && <AgentsView />}
                  {dashTab === 'activity' && <ActivityView />}
                </motion.div>
              </AnimatePresence>
              <div className="mt-5 flex items-end justify-between border-t border-line pt-4 md:hidden">
                <NetworkStatus />
                <button
                  type="button"
                  hidden={IS_LIVE}
                  onClick={() => {
                    reset()
                    setDashTab('overview')
                    toast('Demo state reset', 'info')
                  }}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-faint"
                >
                  <RotateCcw className="size-3" />
                  RESET
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

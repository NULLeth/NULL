import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '../components/ui/Spinner'
import { StatusDot } from '../components/ui/StatusDot'
import { shortHex } from '../lib/format'
import { randHex, randId, randInt } from '../lib/random'
import { DEMO_ADDRESS } from '../lib/wallet'

const TARGETS = [
  { name: 'CLAUDE API', result: '200 OK · 1.18s' },
  { name: 'ETH RPC', result: 'eth_call · 41ms' },
  { name: 'WEB SEARCH', result: '4 results · 0.36s' },
  { name: 'GPT API', result: '200 OK · 0.94s' },
]

const STEP_MS = 760
const HOLD_MS = 3400

function makeRun(i: number) {
  const t = TARGETS[i % TARGETS.length]
  return {
    key: i,
    target: t,
    req: randId('req', 6),
    rows: [
      { label: 'WALLET', value: '0x71F…92A', title: DEMO_ADDRESS },
      { label: 'PRIVATE DEPOSIT', value: `note ${shortHex(randHex(32), 5, 3)}` },
      { label: 'ZK PROOF GENERATED', value: `π · ${randInt(360, 480)} ms` },
      { label: 'TEMPORARY ACCESS', value: 'scoped · ttl 60s' },
      { label: t.name, value: t.result },
    ],
  }
}

/**
 * The hero's looping trace: one request walking from a wallet to an API,
 * ending with what the provider can't see. Loops slowly, rotates the target.
 */
export function HeroTerminal() {
  const [runIndex, setRunIndex] = useState(0)
  const [step, setStep] = useState(0)
  const run = useMemo(() => makeRun(runIndex), [runIndex])

  useEffect(() => {
    // steps 0-4: rows, 5-6: privacy results, 7: hold
    const delay = step < 5 ? STEP_MS : step < 7 ? 520 : HOLD_MS
    const t = setTimeout(() => {
      if (step >= 7) {
        setRunIndex((r) => r + 1)
        setStep(0)
      } else setStep((s) => s + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div className="relative w-full max-w-[540px] overflow-hidden rounded-lg border border-line-2 bg-panel/85 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label !text-[10px] text-muted">SESSION TRACE</span>
        <span className="flex items-center gap-3 font-mono text-[10.5px] text-dim">
          <span className="hidden tnum sm:inline">{run.req}</span>
          <span className="inline-flex items-center gap-1.5 tracking-[0.12em] text-ok/90">
            <StatusDot tone="ok" live />
            LIVE
          </span>
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={run.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: 0.35 }}
        >
          <div className="px-4 pb-3 pt-3 font-mono text-[12px] sm:text-[12.5px]">
            {run.rows.map((row, i) => {
              const state = step > i ? 'done' : step === i ? 'active' : 'idle'
              const last = i === run.rows.length - 1
              return (
                <div key={row.label}>
                  <div className="flex h-6 items-center gap-3">
                    <span className="inline-flex w-3.5 justify-center">
                      {state === 'done' ? (
                        <Check className="size-3 text-ok" strokeWidth={2.6} />
                      ) : state === 'active' ? (
                        <Spinner className="size-3 text-soft" />
                      ) : (
                        <span className="size-1 rounded-full bg-faint" />
                      )}
                    </span>
                    <span className={`tracking-[0.08em] transition-colors duration-300 ${state === 'idle' ? 'text-faint' : last ? 'text-fg' : 'text-soft'}`}>
                      {row.label}
                    </span>
                    <span
                      title={row.title}
                      className={`ml-auto truncate text-right text-[11.5px] transition-opacity duration-300 tnum ${
                        state === 'done' ? 'text-muted opacity-100' : 'opacity-0'
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                  {!last && (
                    <div className="flex h-[14px] items-center gap-3">
                      <span className={`inline-flex w-3.5 justify-center text-[10px] leading-none transition-colors duration-300 ${step > i ? 'text-dim' : 'text-faint'}`}>↓</span>
                      {i === 1 && (
                        <span
                          className={`flex flex-1 items-center gap-2 text-[9.5px] tracking-[0.16em] transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}
                        >
                          <span className="h-px flex-1 border-t border-dashed border-eth/35" />
                          <span className="text-eth/80">IDENTITY BOUNDARY</span>
                          <span className="h-px flex-1 border-t border-dashed border-eth/35" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 border-t border-line">
            {[
              { k: 'PAYMENT IDENTITY', at: 5 },
              { k: 'SESSION LINK', at: 6 },
            ].map((r, i) => (
              <div key={r.k} className={`px-4 py-3 ${i === 0 ? 'border-r border-line' : ''}`}>
                <div className="label !text-[9.5px] sm:!text-[10px]">{r.k}</div>
                <div
                  className={`mt-1 flex items-center gap-1.5 font-mono text-[12.5px] tracking-[0.1em] transition-all duration-500 ${
                    step >= r.at ? 'translate-y-0 text-ok opacity-100' : 'translate-y-1 text-faint opacity-40'
                  }`}
                >
                  {step >= r.at ? 'HIDDEN' : 'PENDING'}
                  {step >= r.at && <Check className="size-3.5" strokeWidth={2.6} />}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { StepEvent } from '../../protocol'
import { Spinner } from './Spinner'

export interface StepDef {
  id: string
  label: string
}

interface StepState {
  status: 'idle' | 'active' | 'done'
  detail?: string
  startedAt?: number
  ms?: number
}

export function useSteps(defs: StepDef[]) {
  const [state, setState] = useState<Record<string, StepState>>({})
  const started = useRef<Record<string, number>>({})

  const onStep = useCallback((e: StepEvent) => {
    if (e.phase === 'start') {
      started.current[e.step] = performance.now()
      setState((s) => ({ ...s, [e.step]: { status: 'active' } }))
    } else {
      const ms = performance.now() - (started.current[e.step] ?? performance.now())
      setState((s) => ({ ...s, [e.step]: { status: 'done', detail: e.detail, ms } }))
    }
  }, [])

  const reset = useCallback(() => {
    started.current = {}
    setState({})
  }, [])

  const allDone = defs.every((d) => state[d.id]?.status === 'done')
  const anyStarted = defs.some((d) => state[d.id])
  return { state, onStep, reset, allDone, anyStarted }
}

/** Terminal-style progress log for simulated protocol operations. */
export function TerminalSteps({ defs, state, className = '' }: { defs: StepDef[]; state: Record<string, StepState>; className?: string }) {
  return (
    <ol className={`space-y-0 font-mono text-[12.5px] ${className}`}>
      {defs.map((d, i) => {
        const st = state[d.id]?.status ?? 'idle'
        const s = state[d.id]
        return (
          <li key={d.id} className="relative flex gap-3 py-2">
            {/* rail */}
            {i < defs.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[7px] top-[26px] h-[calc(100%-18px)] w-px transition-colors duration-500 ${st === 'done' ? 'bg-ok/30' : 'bg-line-2'}`}
              />
            )}
            <span className="relative mt-[1px] inline-flex size-[15px] shrink-0 items-center justify-center">
              {st === 'done' ? (
                <span className="inline-flex size-[15px] items-center justify-center rounded-full bg-ok/12 text-ok">
                  <Check className="size-[10px]" strokeWidth={3} />
                </span>
              ) : st === 'active' ? (
                <Spinner className="size-[13px] text-fg" />
              ) : (
                <span className="size-[5px] rounded-full bg-faint" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`transition-colors ${st === 'idle' ? 'text-dim' : 'text-fg'}`}>
                  {d.label}
                  {st === 'active' && <span className="ml-0.5 inline-block w-[7px] animate-blink text-eth">▍</span>}
                </span>
                {s?.ms != null && <span className="tnum shrink-0 text-[11px] text-dim">{(s.ms / 1000).toFixed(2)}s</span>}
              </div>
              <AnimatePresence initial={false}>
                {s?.detail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-0.5 text-[11.5px] text-muted [overflow-wrap:anywhere]">{s.detail}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

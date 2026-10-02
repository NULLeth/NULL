import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Spinner } from './Spinner'

interface Line {
  id: number
  text: string
  state: 'active' | 'done' | 'error'
  started: number
  ms?: number
}

/**
 * Collects free-form status messages from the zkAPI SDK (which reports its own
 * wording) into a terminal-style log: the newest line spins, earlier ones tick.
 */
export function useStatusLog() {
  const [lines, setLines] = useState<Line[]>([])
  const seq = useRef(0)

  const push = useCallback((text: string) => {
    if (!text) return
    setLines((ls) => {
      if (ls.length && ls[ls.length - 1].text === text) return ls
      const now = performance.now()
      const closed = ls.map((l) => (l.state === 'active' ? { ...l, state: 'done' as const, ms: now - l.started } : l))
      return [...closed, { id: ++seq.current, text, state: 'active', started: now }]
    })
  }, [])

  const finish = useCallback((ok: boolean, text?: string) => {
    setLines((ls) => {
      const now = performance.now()
      const closed = ls.map((l) => (l.state === 'active' ? { ...l, state: ok ? ('done' as const) : ('error' as const), ms: now - l.started } : l))
      return text ? [...closed, { id: ++seq.current, text, state: ok ? 'done' : 'error', started: now, ms: 0 }] : closed
    })
  }, [])

  const reset = useCallback(() => setLines([]), [])
  return { lines, push, finish, reset }
}

export function StatusLog({ lines, className = '' }: { lines: Line[]; className?: string }) {
  if (!lines.length) return null
  return (
    <ol className={`rounded-md border border-line bg-[#08080a] px-4 py-2 font-mono text-[12.5px] ${className}`}>
      <AnimatePresence initial={false}>
        {lines.map((l) => (
          <motion.li key={l.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 py-1.5">
            <span className="mt-[2px] inline-flex size-[15px] shrink-0 items-center justify-center">
              {l.state === 'done' ? (
                <span className="inline-flex size-[15px] items-center justify-center rounded-full bg-ok/12 text-ok">
                  <Check className="size-[10px]" strokeWidth={3} />
                </span>
              ) : l.state === 'error' ? (
                <span className="inline-flex size-[15px] items-center justify-center rounded-full bg-bad/15 text-bad">
                  <X className="size-[10px]" strokeWidth={3} />
                </span>
              ) : (
                <Spinner className="size-[13px] text-fg" />
              )}
            </span>
            <span className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${l.state === 'error' ? 'text-bad/90' : 'text-soft'}`}>{l.text}</span>
            {l.ms != null && l.ms > 0 && <span className="shrink-0 text-[11px] text-dim tnum">{(l.ms / 1000).toFixed(1)}s</span>}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}

import { motion } from 'framer-motion'
import { Check, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** 0.05 / 0.10 / 0.25 / CUSTOM — custom reveals an inline input. */
export function AmountPicker({
  presets,
  value,
  custom,
  onPreset,
  onCustom,
  customValue,
  onCustomValue,
  unit = 'ETH',
}: {
  presets: number[]
  value: number | null
  custom: boolean
  onPreset: (v: number) => void
  onCustom: () => void
  customValue: string
  onCustomValue: (v: string) => void
  unit?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (custom) input.current?.focus()
  }, [custom])
  const btn = (on: boolean) =>
    `relative h-11 rounded-md border font-mono text-[12px] tracking-[0.06em] transition-colors ${
      on ? 'border-fg/70 bg-white/[0.06] text-fg' : 'border-line-2 text-muted hover:border-line-3 hover:text-soft'
    }`
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button key={p} type="button" className={btn(!custom && value === p)} onClick={() => onPreset(p)}>
            {p.toFixed(Math.max(2, (String(p).split('.')[1] ?? '').length))} <span className="text-dim">{unit}</span>
          </button>
        ))}
        <button type="button" className={btn(custom)} onClick={onCustom}>
          CUSTOM
        </button>
      </div>
      {custom && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <label className="mt-2 flex h-12 items-center gap-3 rounded-md border border-line-2 bg-white/[0.015] px-4 focus-within:border-line-3">
            <input
              ref={input}
              inputMode="decimal"
              value={customValue}
              onChange={(e) => onCustomValue(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent font-mono text-[18px] text-fg outline-none tnum"
              aria-label={`Custom amount in ${unit}`}
            />
            <span className="font-mono text-[12px] text-dim">{unit}</span>
          </label>
        </motion.div>
      )}
    </div>
  )
}

export function Summary({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="overflow-hidden rounded-md border border-line">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 last:border-b-0">
          <dt className="font-mono text-[11px] tracking-[0.12em] text-dim">{k}</dt>
          <dd className="text-right font-mono text-[12.5px] text-soft tnum">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-md border border-warn/20 bg-warn/[0.045] px-3.5 py-2.5 text-[12.5px] leading-snug text-warn/90">
      <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={1.8} />
      <span>{children}</span>
    </div>
  )
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="label">{children}</span>
      {hint && <span className="font-mono text-[11px] text-dim">{hint}</span>}
    </div>
  )
}

export function SuccessMark() {
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="inline-flex size-11 items-center justify-center rounded-full border border-ok/30 bg-ok/[0.08] text-ok"
    >
      <Check className="size-5" strokeWidth={2.4} />
    </motion.span>
  )
}

export function parseAmount(s: string): number {
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

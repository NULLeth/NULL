import { motion } from 'framer-motion'
import { useId } from 'react'

/** Segmented filter. Scrolls horizontally on narrow screens instead of wrapping. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
}) {
  const id = useId()
  return (
    <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none]">
      <div role="tablist" className="inline-flex gap-0.5 rounded-[7px] border border-line bg-white/[0.015] p-0.5">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => onChange(o.value)}
              className={`relative whitespace-nowrap rounded-[5px] px-3 py-1.5 font-mono text-[10.5px] tracking-[0.12em] transition-colors ${on ? 'text-fg' : 'text-dim hover:text-soft'}`}
            >
              {on && <motion.span layoutId={`chip-${id}`} className="absolute inset-0 rounded-[5px] bg-white/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="relative">
                {o.label}
                {o.count != null && <span className="ml-1.5 text-faint">{o.count}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

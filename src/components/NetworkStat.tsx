import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { AnimatedNumber } from './ui/AnimatedNumber'

export function NetworkStat({
  label,
  value,
  format,
  note,
  mark,
  index = 0,
}: {
  label: string
  value: number
  format: (v: number) => string
  note?: ReactNode
  /** footnote marker, e.g. "*" */
  mark?: string
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="relative px-5 py-7 sm:px-7 sm:py-9"
    >
      <div className="label">{label}</div>
      <div className="mt-4 flex items-start text-[34px] font-medium leading-none tracking-[-0.04em] text-fg sm:text-[44px]">
        <AnimatedNumber value={value} format={format} duration={1400} flash={false} />
        {mark && <span className="ml-1 mt-1 font-mono text-[16px] text-eth">{mark}</span>}
      </div>
      {note && <div className="mt-3 font-mono text-[11px] text-dim">{note}</div>}
    </motion.div>
  )
}

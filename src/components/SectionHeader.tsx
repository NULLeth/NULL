import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function SectionHeader({
  index,
  eyebrow,
  title,
  sub,
  aside,
  className = '',
}: {
  index: string
  eyebrow: string
  title: ReactNode
  sub?: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-[720px]"
      >
        <div className="label mb-5 flex items-center gap-3">
          <span className="text-faint">{index}</span>
          <span className="h-px w-6 bg-line-2" />
          <span className="text-muted">{eyebrow}</span>
        </div>
        <h2 className="text-balance text-[32px] font-medium leading-[1.06] tracking-[-0.035em] text-fg sm:text-[44px]">{title}</h2>
        {sub && <p className="mt-4 max-w-[560px] text-pretty text-[15.5px] leading-relaxed text-muted">{sub}</p>}
      </motion.div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

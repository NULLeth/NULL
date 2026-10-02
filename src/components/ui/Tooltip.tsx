import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Hover / focus / tap tooltip rendered in a portal so it never gets clipped by
 * overflow-hidden panels. Positions above the trigger and clamps to the viewport.
 */
export function Tooltip({ content, children, className = '' }: { content: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean }>({ x: 0, y: 0, below: false })

  const place = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const tipH = tipRef.current?.offsetHeight ?? 48
    const below = r.top < tipH + 16
    setPos({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    const tip = tipRef.current
    if (tip) {
      // clamp horizontally after first measure
      const w = tip.offsetWidth
      setPos((p) => ({ ...p, x: Math.min(Math.max(p.x, w / 2 + 12), window.innerWidth - w / 2 - 12) }))
    }
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const hide = () => setOpen(false)
    window.addEventListener('scroll', hide, { passive: true })
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide)
      window.removeEventListener('resize', hide)
    }
  }, [open])

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        className={`inline-flex cursor-help outline-none ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        {children}
      </span>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={tipRef}
              role="tooltip"
              initial={{ opacity: 0, y: pos.below ? -4 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ left: pos.x, top: pos.y, translateX: '-50%', translateY: pos.below ? '0%' : '-100%' }}
              className="pointer-events-none fixed z-[200] w-max max-w-[260px] rounded-md border border-line-2 bg-raised/95 px-3 py-2 text-[12px] leading-[1.45] text-soft shadow-[0_12px_40px_-12px_rgb(0_0_0/0.8)] backdrop-blur"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

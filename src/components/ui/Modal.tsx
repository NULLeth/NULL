import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const widths = {
  sm: 'max-w-[420px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[880px]',
  xl: 'max-w-[1040px]',
}

export function Modal({
  open,
  onClose,
  eyebrow,
  title,
  width = 'md',
  locked = false,
  children,
}: {
  open: boolean
  onClose: () => void
  eyebrow?: ReactNode
  title?: ReactNode
  width?: keyof typeof widths
  /** while a simulated transaction runs the modal can't be dismissed */
  locked?: boolean
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const lockedRef = useRef(locked)
  lockedRef.current = locked

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    const prevPad = document.body.style.paddingRight
    const sbw = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevFocus = document.activeElement as HTMLElement | null
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, button:not([data-close])')
      first?.focus({ preventScroll: true })
    }, 60)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPad
      prevFocus?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <div
            className="absolute inset-0 bg-[#030304]/80 backdrop-blur-[6px]"
            onClick={() => !locked && onClose()}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            className={`relative flex max-h-[92dvh] w-full ${widths[width]} flex-col overflow-hidden rounded-t-xl border border-line-2 bg-panel shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] sm:rounded-xl`}
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            {/* hairline highlight along the top edge */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
            {(title || eyebrow) && (
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  {eyebrow && <div className="label mb-1">{eyebrow}</div>}
                  {title && <h2 className="text-[17px] font-medium tracking-[-0.01em] text-fg">{title}</h2>}
                </div>
                <button
                  data-close
                  type="button"
                  onClick={onClose}
                  disabled={locked}
                  aria-label="Close"
                  className="-mr-1.5 -mt-0.5 inline-flex size-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-white/5 hover:text-fg disabled:opacity-30"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

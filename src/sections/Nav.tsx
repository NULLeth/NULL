import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from '../components/Logo'
import { StatusDot } from '../components/ui/StatusDot'
import { WalletButton } from '../components/WalletButton'
import { scrollToId } from '../state/ui'

const LINKS = [
  { id: 'network', label: 'NETWORK' },
  { id: 'services', label: 'SERVICES' },
  { id: 'agents', label: 'AGENTS' },
  { id: 'about', label: 'ABOUT' },
]

function useActiveSection() {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    const onTop = () => window.scrollY < 200 && setActive(null)
    window.addEventListener('scroll', onTop, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onTop)
    }
  }, [])
  return active
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [sheet, setSheet] = useState(false)
  const active = useActiveSection()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : ''
  }, [sheet])

  const go = (id: string) => {
    setSheet(false)
    scrollToId(id)
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled || sheet ? 'border-b border-line bg-bg/75 backdrop-blur-xl' : 'border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="NULL — back to top">
            <Logo />
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {LINKS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                className={`relative rounded-md px-3 py-2 font-mono text-[11px] tracking-[0.14em] transition-colors hover:text-fg ${
                  active === l.id ? 'text-fg' : 'text-muted'
                }`}
              >
                {l.label}
                {active === l.id && (
                  <motion.span layoutId="nav-active" className="absolute inset-x-3 -bottom-[13px] h-px bg-fg" transition={{ type: 'spring', stiffness: 400, damping: 36 }} />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-5">
            <div className="hidden items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] text-dim lg:flex">
              STATUS
              <span className="inline-flex items-center gap-1.5 text-ok/90">
                <StatusDot tone="ok" live />
                ONLINE
              </span>
            </div>
            <div className="hidden sm:block">
              <WalletButton />
            </div>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md border border-line-2 text-soft md:hidden"
              onClick={() => setSheet((s) => !s)}
              aria-label={sheet ? 'Close menu' : 'Open menu'}
              aria-expanded={sheet}
            >
              {sheet ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {sheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-16 z-40 bg-bg/95 backdrop-blur-xl md:hidden"
          >
            <motion.nav
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              className="flex h-full flex-col px-4 pb-8 pt-4"
              aria-label="Mobile"
            >
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.id}
                  type="button"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                  onClick={() => go(l.id)}
                  className="flex items-center justify-between border-b border-line py-4 text-left font-mono text-[13px] tracking-[0.16em] text-soft"
                >
                  {l.label}
                  <span className="text-faint">0{i + 1}</span>
                </motion.button>
              ))}
              <div className="mt-8">
                <WalletButton block />
              </div>
              <div className="mt-auto flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] text-dim">
                STATUS
                <span className="inline-flex items-center gap-1.5 text-ok/90">
                  <StatusDot tone="ok" live />
                  ONLINE
                </span>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

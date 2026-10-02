import { motion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { LogoMark } from '../components/Logo'
import { SectionHeader } from '../components/SectionHeader'
import { ServiceCard } from '../components/ServiceCard'
import { FilterChips } from '../components/ui/FilterChips'
import { StatusDot } from '../components/ui/StatusDot'
import { GROUP_LABEL, MORE_ROUTES, SERVICES, type ServiceGroup } from '../protocol'
import { useActions } from '../state/actions'

/** y offset (from a card's top) where its branch meets the card — the header row. */
const BRANCH_Y = 38

interface Geometry {
  spineTop: number
  centers: number[]
  wide: boolean
}

/**
 * Services hang off a single router spine. Hovering a card lights its branch
 * and the path back up to the router.
 */
export function Services() {
  const { openService } = useActions()
  const [group, setGroup] = useState<'all' | ServiceGroup>('all')
  const [hover, setHover] = useState<number | null>(null)
  const list = SERVICES.filter((s) => group === 'all' || s.group === group)

  const box = useRef<HTMLDivElement>(null)
  const router = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const [geo, setGeo] = useState<Geometry>({ spineTop: 0, centers: [], wide: true })

  useLayoutEffect(() => {
    const measure = () => {
      const r = router.current
      if (!r || !box.current) return
      const centers = list.map((_, i) => {
        const c = cards.current[i]
        return c ? c.offsetTop + BRANCH_Y : 0
      })
      setGeo({ spineTop: r.offsetTop + r.offsetHeight, centers, wide: window.innerWidth >= 1024 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length, group])

  const last = geo.centers.length ? Math.max(...geo.centers) : geo.spineTop
  const spineX = geo.wide ? '50%' : '11.5px'
  const lit = hover != null ? geo.centers[hover] : null

  return (
    <section id="services" className="relative scroll-mt-16 border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="03"
          eyebrow="SERVICES"
          title="Available services"
          sub="Pay per request from your private balance. No accounts, no API keys, no card on file. Providers see a valid payment, not a customer."
          aside={
            <FilterChips
              value={group}
              onChange={(g) => {
                setGroup(g)
                setHover(null)
              }}
              options={[
                { value: 'all', label: 'ALL', count: SERVICES.length },
                ...(Object.keys(GROUP_LABEL) as ServiceGroup[]).map((g) => ({
                  value: g,
                  label: GROUP_LABEL[g],
                  count: SERVICES.filter((s) => s.group === g).length,
                })),
              ]}
            />
          }
        />

        <div ref={box} className="relative mt-14">
          {/* spine */}
          <span aria-hidden className="absolute w-px bg-line-2" style={{ left: spineX, top: geo.spineTop, height: Math.max(0, last - geo.spineTop) }} />
          <span
            aria-hidden
            className="absolute w-px bg-eth/80 shadow-[0_0_6px_rgb(138_152_255/0.55)] transition-[height,opacity] duration-500 ease-out"
            style={{ left: spineX, top: geo.spineTop, height: lit != null ? Math.max(0, lit - geo.spineTop) : 0, opacity: lit != null ? 1 : 0 }}
          />
          {/* idle packet running down the spine */}
          <motion.span
            aria-hidden
            className="absolute size-[5px] -translate-x-1/2 rounded-full bg-eth"
            style={{ left: spineX }}
            animate={{ top: [geo.spineTop, last], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
          />

          {/* router */}
          <div className="flex lg:justify-center">
            <div
              ref={router}
              className="relative z-10 flex items-center gap-3 rounded-lg border border-line-2 bg-panel px-4 py-3 shadow-[0_0_0_6px_var(--color-bg)]"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-md border border-eth/30 text-eth">
                <LogoMark className="size-4" />
              </span>
              <div>
                <div className="font-mono text-[11.5px] tracking-[0.14em] text-fg">NULL ROUTER</div>
                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-dim">
                  <StatusDot tone="ok" live /> verifies proofs · settles providers
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-[24px_minmax(0,1fr)] gap-y-4 lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] lg:gap-y-5">
            {list.map((svc, i) => {
              const left = i % 2 === 0
              const row = geo.wide ? Math.floor(i / 2) + 1 : i + 1
              const col = geo.wide ? (left ? 1 : 3) : 2
              const on = hover === i
              return (
                <motion.div
                  key={svc.id}
                  ref={(el) => {
                    cards.current[i] = el
                  }}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: (i % 2) * 0.06 }}
                  className="relative"
                  style={{ gridRow: row, gridColumn: col }}
                >
                  {/* branch to the spine */}
                  <span
                    aria-hidden
                    className={`absolute h-px transition-[background-color,box-shadow] duration-300 ${on ? 'bg-eth/80 shadow-[0_0_6px_rgb(138_152_255/0.55)]' : 'bg-line-2'}`}
                    style={
                      geo.wide
                        ? { top: BRANCH_Y, width: 36, ...(left ? { right: -36 } : { left: -36 }) }
                        : { top: BRANCH_Y, width: 12.5, left: -12.5 }
                    }
                  />
                  <span
                    aria-hidden
                    className={`absolute size-[7px] -translate-y-[3px] rounded-full border transition-colors duration-300 ${on ? 'border-eth bg-eth' : 'border-line-3 bg-bg'}`}
                    style={geo.wide ? { top: BRANCH_Y, ...(left ? { right: -4 } : { left: -4 }) } : { top: BRANCH_Y, left: -4 }}
                  />
                  <ServiceCard svc={svc} active={on} onUse={() => openService(svc.id)} onHover={(h) => setHover(h ? i : null)} />
                </motion.div>
              )
            })}
          </div>

          <p className="mt-10 font-mono text-[11px] leading-relaxed text-dim max-lg:pl-6 lg:text-center">
            ALSO ROUTED · <span className="text-muted">{MORE_ROUTES.join('  ·  ')}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

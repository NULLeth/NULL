import { useMemo } from 'react'
import { ServiceIcon } from '../components/ServiceIcon'
import { Tooltip } from '../components/ui/Tooltip'
import { fmtUsd } from '../lib/format'
import { SERVICES, type ServiceId } from '../protocol'
import type { ActivityEvent } from '../state/types'

/** Spend per service over the last 24h, people and agents combined. Single hue: magnitude only. */
export function SpendBreakdown({ events }: { events: ActivityEvent[] }) {
  const rows = useMemo(() => {
    const since = Date.now() - 24 * 3600_000
    const acc = new Map<ServiceId, { usd: number; n: number; agents: number }>()
    for (const e of events) {
      if (e.ts < since || !e.serviceId || e.costUsd == null) continue
      const r = acc.get(e.serviceId) ?? { usd: 0, n: 0, agents: 0 }
      r.usd += e.costUsd
      r.n += 1
      if (e.kind === 'agent') r.agents += 1
      acc.set(e.serviceId, r)
    }
    return SERVICES.map((s) => ({ svc: s, ...(acc.get(s.id) ?? { usd: 0, n: 0, agents: 0 }) })).sort((a, b) => b.usd - a.usd)
  }, [events])

  const max = Math.max(...rows.map((r) => r.usd), 0.0001)
  const total = rows.reduce((s, r) => s + r.usd, 0)
  const count = rows.reduce((s, r) => s + r.n, 0)

  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-panel-2">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
        <span className="label">SPEND BY SERVICE · 24H</span>
        <span className="font-mono text-[11.5px] text-muted tnum">
          {fmtUsd(total, { cents: true })} <span className="text-dim">· {count} req</span>
        </span>
      </div>
      <ul className="flex flex-1 flex-col justify-center gap-1 px-3 py-3">
        {rows.map((r) => (
          <li key={r.svc.id}>
            <Tooltip
              className="block w-full"
              content={
                <span className="font-mono text-[11.5px]">
                  <span className="text-fg">{r.svc.name}</span>
                  <br />
                  {r.n} requests · {fmtUsd(r.usd, { micro: true })}
                  <br />
                  <span className="text-dim">
                    {r.agents} by agents · {r.n - r.agents} by you
                  </span>
                </span>
              }
            >
              <span className="grid w-full grid-cols-[112px_1fr_64px] items-center gap-3 rounded-md px-2 py-[7px] transition-colors hover:bg-white/[0.03]">
                <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-muted">
                  <ServiceIcon id={r.svc.id} className="size-3 shrink-0 text-dim" />
                  <span className="truncate">{r.svc.name}</span>
                </span>
                <span className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-soft/75 transition-[width] duration-700 ease-out"
                    style={{ width: `${r.usd > 0 ? Math.max(2, (r.usd / max) * 100) : 0}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[11.5px] text-soft tnum">{r.usd > 0 ? fmtUsd(r.usd, { micro: true }) : '—'}</span>
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { ArrowRight } from 'lucide-react'
import { IS_LIVE } from '../config/mode'
import type { ServiceInfo } from '../protocol'
import { fmtUsd } from '../lib/format'
import { PrivacyIndicator } from './PrivacyIndicator'
import { ServiceIconTile } from './ServiceIcon'
import { Button } from './ui/Button'
import { StatusDot } from './ui/StatusDot'

function Status({ status }: { status: ServiceInfo['status'] }) {
  if (status === 'soon') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-dim">
        <StatusDot tone="dim" />
        SOON
      </span>
    )
  }
  const ok = status === 'online'
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] ${ok ? 'text-ok/90' : 'text-warn'}`}>
      <StatusDot tone={ok ? 'ok' : 'warn'} live={ok} />
      {ok ? 'ONLINE' : 'DEGRADED'}
    </span>
  )
}

export function Price({ svc, className = '' }: { svc: ServiceInfo; className?: string }) {
  if (IS_LIVE && svc.kind === 'chat') {
    return (
      <span className={`font-mono text-[13px] text-fg tnum ${className}`}>
        METERED<span className="text-dim"> / TOKEN</span>
      </span>
    )
  }
  return (
    <span className={`font-mono text-[13px] text-fg tnum ${className}`}>
      {fmtUsd(svc.priceUsd, { micro: true })}
      <span className="text-dim"> / {svc.unit}</span>
    </span>
  )
}

/** Landing-page service card (connected to the router spine). */
export function ServiceCard({
  svc,
  active,
  onUse,
  onHover,
}: {
  svc: ServiceInfo
  active?: boolean
  onUse: () => void
  onHover?: (hovering: boolean) => void
}) {
  return (
    <article
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={`group relative flex h-full flex-col rounded-lg border bg-panel/80 p-5 transition-[border-color,background-color] duration-300 ${
        active ? 'border-line-3 bg-panel-2' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ServiceIconTile id={svc.id} />
          <div>
            <h3 className="font-mono text-[13px] font-medium tracking-[0.14em] text-fg">{svc.name.toUpperCase()}</h3>
            <div className="label mt-0.5">{svc.category}</div>
          </div>
        </div>
        <Status status={svc.status} />
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-muted">{svc.description}</p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between border-t border-line pt-4">
          <Price svc={svc} />
          <span className="font-mono text-[11px] text-dim tnum">p50 {svc.latencyMs < 1000 ? `${svc.latencyMs}ms` : `${(svc.latencyMs / 1000).toFixed(1)}s`}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <PrivacyIndicator />
          <Button size="sm" variant="secondary" onClick={onUse} iconRight={<ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />}>
            Use service
          </Button>
        </div>
      </div>
    </article>
  )
}

/** Compact row for the dashboard's SERVICES view. */
export function ServiceRow({ svc, onUse }: { svc: ServiceInfo; onUse: () => void }) {
  return (
    <div className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.015] sm:px-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_88px_minmax(0,1.1fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <ServiceIconTile id={svc.id} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-[14px] text-fg">{svc.name}</div>
          <div className="label truncate !text-[10px]">
            {svc.category} · <span className="normal-case tracking-normal">{svc.route}</span>
          </div>
        </div>
      </div>
      <Price svc={svc} className="hidden !text-[12.5px] md:block" />
      <span className="hidden md:block">
        <Status status={svc.status} />
      </span>
      <span className="hidden md:block">
        <PrivacyIndicator />
      </span>
      <div className="flex items-center justify-end gap-3">
        <Price svc={svc} className="!text-[11.5px] md:hidden" />
        <Button size="sm" variant="secondary" onClick={onUse}>
          Use
        </Button>
      </div>
    </div>
  )
}

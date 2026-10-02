type Tone = 'ok' | 'warn' | 'dim' | 'eth' | 'bad'

const fill: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  dim: 'bg-dim',
  eth: 'bg-eth',
  bad: 'bg-bad',
}

/** Small status dot, optionally with a slow ping ring for "live" states. */
export function StatusDot({ tone = 'ok', live = false, className = '' }: { tone?: Tone; live?: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex size-1.5 shrink-0 ${className}`} aria-hidden>
      {live && <span className={`absolute inset-0 rounded-full ${fill[tone]} animate-ping-slow`} />}
      <span className={`relative inline-flex size-1.5 rounded-full ${fill[tone]}`} />
    </span>
  )
}

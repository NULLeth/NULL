import { PROJECT } from '../config/project'

/** 0x71F3…992A → "0x71F…92A" (the compact style used across the UI). */
export function shortAddr(addr: string, head = 5, tail = 3): string {
  if (!addr) return ''
  if (addr.length <= head + tail + 1) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

export function shortHex(hex: string, head = 6, tail = 4): string {
  return shortAddr(hex, head, tail)
}

export function fmtEth(v: number, digits = 4): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtUsd(v: number, opts: { cents?: boolean; micro?: boolean } = {}): string {
  if (opts.micro) {
    // per-request prices: $0.0021, $0.012, $0.04 (4 decimals max, trailing zeros trimmed, at least 2)
    if (v >= 1) return '$' + v.toFixed(2)
    const t = v.toFixed(4).replace(/0+$/, '')
    const [i, f = ''] = t.split('.')
    return `$${i}.${f.padEnd(2, '0')}`
  }
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  })
}

export function fmtInt(v: number): string {
  return Math.round(v).toLocaleString('en-US')
}

/** $482K / $1.2M style */
export function fmtCompactUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}

export function ethToUsd(eth: number): number {
  return eth * PROJECT.ethUsd
}

export function usdToEth(usd: number): number {
  return usd / PROJECT.ethUsd
}

export function clock(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

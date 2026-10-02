// Drawing kit for the NULL films: the site's palette and type, plus small helpers.
// Everything is drawn in a 1920×1080 design space; callers scale the context first.

export const C = {
  bg: '#060607',
  panel: '#0a0a0c',
  panel2: '#0e0e11',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  line3: 'rgba(255,255,255,0.22)',
  fg: '#f1f1f3',
  soft: '#c9c9cf',
  muted: '#94949d',
  dim: '#64646d',
  faint: '#3a3a41',
  eth: '#8a98ff',
  ok: '#43d392',
  warn: '#e0b45e',
  bad: '#ef6b6b',
}

export const SANS = "'Geist Variable', system-ui, sans-serif"
export const MONO = "'Geist Mono Variable', ui-monospace, monospace"

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** 0→1 as t goes from a to b */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
/** Opacity of something shown from a to b, fading in and out. */
export function win(t: number, a: number, b: number, fin = 0.5, fout = 0.5): number {
  if (t <= a || t >= b) return 0
  return easeOut(Math.min(1, (t - a) / fin, (b - t) / fout))
}

/** Deterministic PRNG so every render of a frame is identical. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = a
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export interface TextOpts {
  size: number
  weight?: number
  family?: string
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  /** CSS length, e.g. '0.2em' or '-2px' */
  spacing?: string
  alpha?: number
}

export function setFont(ctx: CanvasRenderingContext2D, o: TextOpts) {
  ctx.font = `${o.weight ?? 500} ${o.size}px ${o.family ?? SANS}`
  ctx.letterSpacing = o.spacing ?? '0px'
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.baseline ?? 'alphabetic'
}

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts): number {
  ctx.save()
  setFont(ctx, o)
  ctx.globalAlpha *= o.alpha ?? 1
  ctx.fillStyle = o.color ?? C.fg
  ctx.fillText(s, x, y)
  const w = ctx.measureText(s).width
  ctx.restore()
  return w
}

export function measure(ctx: CanvasRenderingContext2D, s: string, o: TextOpts): number {
  ctx.save()
  setFont(ctx, o)
  const w = ctx.measureText(s).width
  ctx.restore()
  return w
}

/** Word-wraps s into lines no wider than maxWidth. */
export function wrap(ctx: CanvasRenderingContext2D, s: string, maxWidth: number, o: TextOpts): string[] {
  ctx.save()
  setFont(ctx, o)
  const lines: string[] = []
  let line = ''
  for (const word of s.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  ctx.restore()
  return lines
}

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill = C.panel, stroke = C.line2) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = stroke
  ctx.stroke()
}

export function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = C.ok, width = 3) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - size * 0.45, cy)
  ctx.lineTo(cx - size * 0.12, cy + size * 0.32)
  ctx.lineTo(cx + size * 0.48, cy - size * 0.36)
  ctx.stroke()
  ctx.restore()
}

/** A done tick inside a soft green disc. */
export function doneDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha = 1) {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(67,211,146,0.14)'
  ctx.fill()
  check(ctx, cx, cy, r * 1.05, C.ok, Math.max(2, r * 0.22))
  ctx.restore()
}

export function spinner(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, color = C.fg) {
  ctx.save()
  ctx.lineWidth = Math.max(2, r * 0.22)
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = color
  const a = t * Math.PI * 2 * 1.4
  ctx.beginPath()
  ctx.arc(cx, cy, r, a, a + Math.PI * 0.55)
  ctx.stroke()
  ctx.restore()
}

/** The ∅ mark: ring drawn to `ring` (0..1), slash drawn to `slash` (0..1). */
export function nullMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ring: number, slash: number, width: number, color = C.fg) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  if (ring > 0) {
    ctx.beginPath()
    const start = -Math.PI / 2
    ctx.arc(cx, cy, r, start, start + Math.PI * 2 * clamp(ring))
    ctx.stroke()
  }
  if (slash > 0) {
    const half = r * 1.327
    const d = half / Math.SQRT2
    const x0 = cx - d
    const y0 = cy + d
    const p = clamp(slash)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + 2 * d * p, y0 - 2 * d * p)
    ctx.stroke()
  }
  ctx.restore()
}

export function grid(ctx: CanvasRenderingContext2D, alpha: number) {
  if (alpha <= 0) return
  ctx.save()
  const g = ctx.createRadialGradient(960, 480, 100, 960, 540, 1100)
  g.addColorStop(0, `rgba(255,255,255,${0.045 * alpha})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.strokeStyle = g
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= 1920; x += 64) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, 1080)
  }
  for (let y = 0; y <= 1080; y += 64) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(1920, y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

const NODES = (() => {
  const r = seeded(0x6e756c6c)
  return Array.from({ length: 70 }, () => ({ x: r() * 1920, y: r() * 1080, p: r() * Math.PI * 2, s: 0.4 + r() * 0.8, hub: r() < 0.08 }))
})()

/** Slowly drifting network of nodes and faint links, same feel as the site hero. */
export function network(ctx: CanvasRenderingContext2D, t: number, alpha: number) {
  if (alpha <= 0) return
  const pts = NODES.map((n) => ({ x: n.x + Math.sin(t * 0.13 * n.s + n.p) * 26, y: n.y + Math.cos(t * 0.11 * n.s + n.p) * 18, hub: n.hub }))
  ctx.save()
  ctx.lineWidth = 1
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x
      const dy = pts[i].y - pts[j].y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 190) continue
      ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 190) * 0.07 * alpha})`
      ctx.beginPath()
      ctx.moveTo(pts[i].x, pts[i].y)
      ctx.lineTo(pts[j].x, pts[j].y)
      ctx.stroke()
    }
  }
  for (const p of pts) {
    ctx.fillStyle = `rgba(255,255,255,${(p.hub ? 0.5 : 0.28) * alpha})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.hub ? 2.2 : 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function vignette(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1150)
  g.addColorStop(0, 'rgba(6,6,7,0)')
  g.addColorStop(1, 'rgba(6,6,7,0.85)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1920, 1080)
}

/** Soft colored glow, e.g. behind the logo. */
export function glow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rgb: string, a: number) {
  if (a <= 0) return
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
}

/** Caps label + headline at the top of a scene. */
export function caption(ctx: CanvasRenderingContext2D, label: string, headline: string, alpha: number, labelColor: string = C.muted, y = 150) {
  if (alpha <= 0) return
  text(ctx, label, 960, y, { size: 20, family: MONO, color: labelColor, align: 'center', spacing: '0.18em', alpha })
  text(ctx, headline, 960, y + 66, { size: 50, weight: 500, color: C.fg, align: 'center', spacing: '-1.5px', alpha })
}

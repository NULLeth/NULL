// Stats card (still) and stats film from live zkAPI numbers. Pure functions of the data
// snapshot and time, like the other films.

import type { ZkStats } from '../src/studio/stats'
import { PROJECT } from '../src/config/project'
import type { Film } from './films'
import { C, MONO, clamp, easeInOut, easeOut, glow, grid, network, nullMark, panel, prog, text, win } from './kit'

export const STATS_DURATION = 16

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtEthShort = (v: number) => (v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3))

function tiles(s: ZkStats) {
  return [
    { k: 'PRIVATE NOTES', v: s.notes, fmt: (x: number) => Math.round(x).toLocaleString('en-US'), sub: 'deposits since launch' },
    { k: 'ETH DEPOSITED', v: s.depositedEth, fmt: fmtEthShort, sub: 'into the zkAPI vault' },
    { k: 'ANONYMITY SET', v: s.active, fmt: (x: number) => Math.round(x).toLocaleString('en-US'), sub: 'open notes right now' },
    { k: 'NEW IN 24H', v: s.new24h, fmt: (x: number) => `+${Math.round(x)}`, sub: 'in the last 24 hours' },
  ]
}

function header(ctx: CanvasRenderingContext2D, s: ZkStats, a: number) {
  ctx.save()
  ctx.globalAlpha = a
  nullMark(ctx, 176, 124, 16, 1, 1, 4)
  text(ctx, 'NULL', 206, 134, { size: 24, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'zkAPI · LIVE STATS', 340, 134, { size: 20, family: MONO, color: C.muted, spacing: '0.16em' })
  text(ctx, fmtDate(s.updatedAt), 1760, 134, { size: 20, family: MONO, color: C.muted, align: 'right', spacing: '0.08em' })
  ctx.restore()
}

/** The four numbers, counting up with progress p (0..1) per tile. */
function numbers(ctx: CanvasRenderingContext2D, s: ZkStats, p: (i: number) => number, alpha = 1) {
  const list = tiles(s)
  list.forEach((t, i) => {
    const x = 160 + i * 410
    const y = 210
    const pa = clamp(p(i))
    ctx.save()
    ctx.globalAlpha = alpha * Math.min(1, pa * 3)
    panel(ctx, x, y, 390, 230, 18, C.panel, C.line2)
    text(ctx, t.k, x + 32, y + 52, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, t.fmt(t.v * easeOut(pa)), x + 32, y + 150, { size: 84, weight: 500, spacing: '-3px', color: i === 2 ? C.eth : C.fg })
    text(ctx, t.sub, x + 32, y + 196, { size: 20, color: C.muted })
    ctx.restore()
  })
}

/** Cumulative notes over time; drawn up to fraction `reveal`. */
function chart(ctx: CanvasRenderingContext2D, s: ZkStats, reveal: number, alpha = 1) {
  const X = 160
  const Y = 490
  const W = 1600
  const H = 330
  ctx.save()
  ctx.globalAlpha = alpha
  panel(ctx, X, Y, W, H + 90, 18, C.panel, C.line2)
  text(ctx, 'PRIVATE NOTES OVER TIME', X + 32, Y + 46, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
  const px = X + 32
  const pw = W - 64
  const py = Y + 80
  const ph = H - 40
  const t0 = s.firstTs
  const t1 = Math.max(s.updatedAt, t0 + 3_600_000)
  const max = Math.max(1, s.notes)
  // baseline + gridlines
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1
  for (let g = 0; g <= 2; g++) {
    const gy = py + ph - (ph * g) / 2
    ctx.beginPath()
    ctx.moveTo(px, gy)
    ctx.lineTo(px + pw, gy)
    ctx.stroke()
  }
  // step path
  const pts: [number, number][] = [[px, py + ph]]
  let last = 0
  for (const d of s.series) {
    const x = px + ((d.ts - t0) / (t1 - t0)) * pw
    pts.push([x, py + ph - (last / max) * ph])
    pts.push([x, py + ph - (d.notes / max) * ph])
    last = d.notes
  }
  pts.push([px + pw, py + ph - (last / max) * ph])
  const cut = px + pw * clamp(reveal)
  ctx.save()
  ctx.beginPath()
  ctx.rect(px - 4, py - 20, cut - px + 8, ph + 40)
  ctx.clip()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineTo(px + pw, py + ph)
  ctx.closePath()
  ctx.fillStyle = 'rgba(138,152,255,0.10)'
  ctx.fill()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.strokeStyle = C.eth
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
  // labels
  text(ctx, fmtDate(t0), px, py + ph + 40, { size: 17, family: MONO, color: C.dim })
  text(ctx, 'now', px + pw, py + ph + 40, { size: 17, family: MONO, color: C.dim, align: 'right' })
  text(ctx, `${s.notes}`, px + 8, py + 6, { size: 17, family: MONO, color: C.dim })
  if (reveal >= 1) {
    const ex = px + pw
    const ey = py + ph - (last / max) * ph
    ctx.fillStyle = C.eth
    ctx.beginPath()
    ctx.arc(ex, ey, 7, 0, Math.PI * 2)
    ctx.fill()
    glow(ctx, ex, ey, 34, '138,152,255', 0.4)
  }
  ctx.restore()
}

function footer(ctx: CanvasRenderingContext2D, s: ZkStats, a: number) {
  text(ctx, `vault holds ${fmtEthShort(s.vaultEth)} ETH · ${s.closed} notes closed · live since ${fmtDate(s.firstTs)}`, 160, 990, {
    size: 18,
    family: MONO,
    color: C.dim,
    alpha: a,
  })
  text(ctx, `${PROJECT.domain}  ·  ${PROJECT.xHandle}`, 1760, 990, { size: 18, family: MONO, color: C.muted, align: 'right', alpha: a })
}

/** Only the very edges darken, so no number sits in shadow. */
function softEdges(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(960, 540, 700, 960, 540, 1250)
  g.addColorStop(0, 'rgba(6,6,7,0)')
  g.addColorStop(1, 'rgba(6,6,7,0.7)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1920, 1080)
}

/** Still image: everything at its final state. */
export function drawStatsCard(ctx: CanvasRenderingContext2D, w: number, s: ZkStats) {
  const k = w / 1920
  ctx.save()
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.6)
  network(ctx, 4, 0.18)
  header(ctx, s, 1)
  numbers(ctx, s, () => 1)
  chart(ctx, s, 1)
  footer(ctx, s, 1)
  softEdges(ctx)
  ctx.restore()
}

/** ~16 s video: title → numbers count up while the curve draws → closing line. */
export function makeStatsFilm(s: ZkStats, sound: Film['sound']): Film {
  return {
    duration: STATS_DURATION,
    sound,
    draw(ctx, w, _h, t) {
      const k = w / 1920
      ctx.save()
      ctx.setTransform(k, 0, 0, k, 0, 0)
      ctx.fillStyle = C.bg
      ctx.fillRect(0, 0, 1920, 1080)
      grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
      network(ctx, t, 0.22)

      // title
      const ta = win(t, 0, 3.0, 0.3, 0.4)
      if (ta) {
        ctx.save()
        ctx.globalAlpha = ta
        glow(ctx, 960, 440, 420, '138,152,255', 0.08)
        nullMark(ctx, 960, 420, 70, easeInOut(prog(t, 0.2, 0.9)), easeOut(prog(t, 0.85, 1.15)), 15)
        text(ctx, 'zkAPI, by the numbers', 960, 610, { size: 72, weight: 600, align: 'center', spacing: '-2.5px', alpha: easeOut(prog(t, 0.9, 1.4)) })
        text(ctx, `Ethereum mainnet · ${fmtDate(s.updatedAt)}`, 960, 670, { size: 30, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.2, 1.7)) })
        ctx.restore()
      }

      // stats
      const sa = win(t, 2.9, 12.4, 0.4, 0.4)
      if (sa) {
        header(ctx, s, sa)
        numbers(ctx, s, (i) => prog(t, 3.3 + i * 0.5, 5.3 + i * 0.5), sa)
        chart(ctx, s, easeInOut(prog(t, 4.4, 8.4)), sa)
        footer(ctx, s, sa * easeOut(prog(t, 8.4, 9.0)))
      }

      // closing line
      const ea = easeOut(prog(t, 12.4, 13.0))
      if (ea) {
        ctx.save()
        ctx.globalAlpha = ea
        nullMark(ctx, 960, 360, 62, 1, 1, 13)
        text(ctx, 'Every new note makes', 960, 560, { size: 64, weight: 600, align: 'center', spacing: '-2px' })
        text(ctx, 'everyone more private.', 960, 636, { size: 64, weight: 600, align: 'center', spacing: '-2px', color: C.muted })
        text(ctx, `${PROJECT.domain}/chat  ·  ${PROJECT.xHandle}`, 960, 760, { size: 30, family: MONO, color: C.fg, align: 'center' })
        if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 900, { size: 22, family: MONO, color: C.muted, align: 'center' })
        ctx.restore()
      }
      softEdges(ctx)
      ctx.restore()
    },
  }
}

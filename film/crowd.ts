// "Your Crowd": ~26 s promo. Title → a request paid by one of 69 open notes, the proof doesn't
// say which → the sidebar line and the dialog, with two real deposits from the vault: one from
// the busiest day (Oct 2) and the newest one (Oct 13) → what is public and what isn't → end card.
// All numbers are what the zkAPI vault on Ethereum showed on Oct 14, 2026.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, network, nullMark, panel, prog, seeded, text, win } from './kit'

export const CROWD_DURATION = 26

export const CROWD_CUES = {
  crowd: [3.2, 8.6],
  request: 5.0,
  open: 9.4,
  exampleA: 10.2,
  exampleB: 13.6,
  public: [17.4, 21.6],
  end: 21.9,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const WARN_RGB = '224,180,94'
const BAD_RGB = '239,107,107'
const OPEN = 69
const FUNDED = 86
const EXAMPLES = [
  { label: 'A DEPOSIT FROM THE BUSIEST DAY · OCT 2 · 0.00187 ETH', similar: 40, sameDay: 36 },
  { label: 'THE NEWEST DEPOSIT · OCT 13 · 0.0080 ETH', similar: 8, sameDay: 0 },
]
const USERS = new Path2D('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3.128a4 4 0 0 1 0 7.744 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0')

function icon(ctx: CanvasRenderingContext2D, p: Path2D, cx: number, cy: number, size: number, color: string, width = 2) {
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = (width * 24) / size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(p)
  ctx.restore()
}

const lvl = (n: number) => (n >= 20 ? { c: C.ok, rgb: OK_RGB, w: 'BIG CROWD' } : n >= 5 ? { c: C.warn, rgb: WARN_RGB, w: 'SMALL CROWD' } : { c: C.bad, rgb: BAD_RGB, w: 'STANDS OUT' })

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  icon(ctx, USERS, 960, 420, 140 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Your Crowd', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'See who you hide among. Live from Ethereum.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

/** 69 open notes as dots; one of them paid; the proof doesn't say which */
function crowd(ctx: CanvasRenderingContext2D, t: number) {
  const K = CROWD_CUES
  const a = win(t, K.crowd[0], K.crowd[1], 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HOW A REQUEST IS PAID', 960, 200, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'One of these notes paid. Which one? The proof doesn’t say.', 960, 266, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
  const cols = 23
  const rnd = seeded(7)
  const shown = Math.floor(easeOut(prog(t, K.crowd[0] + 0.2, K.crowd[0] + 1.3)) * OPEN)
  const req = prog(t, K.request, K.request + 1.2)
  for (let i = 0; i < OPEN; i++) {
    const x = 420 + (i % cols) * 36 + (rnd() - 0.5) * 6
    const y = 400 + Math.floor(i / cols) * 46 + (rnd() - 0.5) * 6
    if (i >= shown) continue
    // while the request is out, every note glows a little: any of them could have paid
    const pulse = req > 0 && req < 1 ? 0.35 + 0.35 * Math.sin(t * 9 + i) : 0
    ctx.fillStyle = `rgba(${OK_RGB},${0.35 + pulse})`
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  // the request leaving the crowd
  if (t >= K.request) {
    const p = easeInOut(prog(t, K.request, K.request + 1.0))
    ctx.strokeStyle = `rgba(${ETH_RGB},0.8)`
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(1250, 446)
    ctx.lineTo(1250 + 160 * p, 446)
    ctx.stroke()
    ctx.setLineDash([])
    const ba = easeOut(prog(t, K.request + 0.8, K.request + 1.2))
    ctx.save()
    ctx.globalAlpha *= ba
    panel(ctx, 1420, 386, 260, 120, 14, C.panel, `rgba(${ETH_RGB},0.45)`)
    text(ctx, 'THE AI PROVIDER', 1444, 422, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
    text(ctx, 'paid ✓', 1444, 462, { size: 26, weight: 600, color: C.ok })
    text(ctx, 'by a valid note', 1444, 490, { size: 16, family: MONO, color: C.muted })
    ctx.restore()
  }
  const ca = easeOut(prog(t, K.request + 1.4, K.request + 1.9))
  text(ctx, `${OPEN} open notes today · ${FUNDED} funded since launch · the crowd grows with every user`, 960, 640, { size: 20, family: MONO, color: C.muted, align: 'center', alpha: ca })
  ctx.restore()
}

function row(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, n: number, label: string, alpha: number) {
  const L = lvl(n)
  ctx.save()
  ctx.globalAlpha *= alpha
  panel(ctx, x, y, w, 84, 10, 'rgba(0,0,0,0.25)', C.line2)
  text(ctx, String(n), x + 76, y + 54, { size: 40, weight: 500, color: L.c, align: 'right' })
  text(ctx, label, x + 104, y + 38, { size: 18, color: C.fg })
  text(ctx, L.w, x + w - 20, y + 38, { size: 13, family: MONO, color: L.c, align: 'right', spacing: '0.1em' })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = CROWD_CUES
  const a = win(t, 8.4, 17.6, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 120
  const Y = 90
  panel(ctx, X, Y, 1680, 900, 22, C.panel, C.line2)
  // sidebar with the balance and the crowd line
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  ctx.fillRect(X + 1, Y + 1, 340, 898)
  nullMark(ctx, X + 44, Y + 46, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 53, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 53, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(X, Y + 690)
  ctx.lineTo(X + 340, Y + 690)
  ctx.moveTo(X + 340, Y)
  ctx.lineTo(X + 340, Y + 900)
  ctx.stroke()
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + 730, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '0.049918', X + 28, Y + 776, { size: 36, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + 776, { size: 16, family: MONO, color: C.muted })
  const hi = t > K.open - 0.4 && t < K.open + 0.4
  icon(ctx, USERS, X + 36, Y + 812, 15, hi ? C.ok : `rgba(${OK_RGB},0.8)`, 2)
  text(ctx, `hidden among ${OPEN} open notes ›`, X + 52, Y + 817, { size: 14, family: MONO, color: hi ? C.ok : `rgba(${OK_RGB},0.8)` })
  // pointer + click
  const m = easeInOut(prog(t, K.open - 0.9, K.open - 0.15))
  const px = 900 + (X + 120 - 900) * m
  const py = 500 + (Y + 805 - 500) * m
  const pa = win(t, K.open - 1.0, K.open + 0.35, 0.2, 0.2)
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px, py + 30)
    ctx.lineTo(px + 8, py + 23)
    ctx.lineTo(px + 14, py + 36)
    ctx.lineTo(px + 19, py + 34)
    ctx.lineTo(px + 13, py + 21)
    ctx.lineTo(px + 23, py + 21)
    ctx.closePath()
    ctx.fillStyle = C.fg
    ctx.fill()
    ctx.restore()
  }
  // the dialog
  const d = easeOut(prog(t, K.open, K.open + 0.35))
  if (d > 0) {
    ctx.fillStyle = `rgba(3,3,4,${0.7 * d})`
    ctx.fillRect(X, Y, 1680, 900)
    const MX = 560
    const MY = 130 + (1 - d) * 20
    const MW = 800
    ctx.save()
    ctx.globalAlpha *= d
    panel(ctx, MX, MY, MW, 820, 16, C.panel, C.line2)
    text(ctx, 'PRIVACY · YOUR CROWD', MX + 36, MY + 48, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, 'Who you hide among', MX + 36, MY + 84, { size: 26, weight: 500 })
    text(ctx, 'A proof shows that some open note paid, never which one.', MX + 36, MY + 128, { size: 18, color: C.muted })
    panel(ctx, MX + 36, MY + 156, MW - 72, 150, 14, `rgba(${OK_RGB},0.04)`, `rgba(${OK_RGB},0.3)`)
    icon(ctx, USERS, MX + 64, MY + 190, 15, C.ok, 2)
    text(ctx, 'EVERY REQUEST HIDES AMONG', MX + 82, MY + 196, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
    text(ctx, String(OPEN), MX + 60, MY + 262, { size: 60, weight: 500, spacing: '-2px' })
    text(ctx, 'open notes', MX + 150, MY + 262, { size: 20, color: C.muted })
    text(ctx, `${FUNDED} funded since launch · ${FUNDED - OPEN} closed · grows with every new user`, MX + 60, MY + 290, { size: 14, family: MONO, color: C.dim })
    // two real examples, one after the other
    const which = t < K.exampleB ? 0 : 1
    const e = EXAMPLES[which]
    const ea = which === 0 ? easeOut(prog(t, K.exampleA, K.exampleA + 0.4)) * (1 - prog(t, K.exampleB - 0.3, K.exampleB)) : easeOut(prog(t, K.exampleB, K.exampleB + 0.4))
    text(ctx, e.label, MX + 36, MY + 350, { size: 13, family: MONO, color: C.dim, spacing: '0.12em', alpha: ea })
    row(ctx, MX + 36, MY + 370, MW - 72, e.similar, 'other deposits of a similar size (±25 %)', ea)
    row(ctx, MX + 36, MY + 466, MW - 72, e.sameDay, 'other deposits on the same day', ea)
    const ta = easeOut(prog(t, K.exampleB + 0.8, K.exampleB + 1.3))
    text(ctx, 'busy days and common sizes make a bigger crowd', MX + 36, MY + 600, { size: 17, family: MONO, color: C.soft, alpha: Math.max(ta, which === 0 ? easeOut(prog(t, K.exampleA + 1.2, K.exampleA + 1.7)) * 0.0 : 0) })
    text(ctx, `read live from the zkAPI vault 0x4386…81fe on Ethereum`, MX + 36, MY + 780, { size: 13, family: MONO, color: C.dim })
    ctx.restore()
  }
  ctx.restore()
}

function publicScene(ctx: CanvasRenderingContext2D, t: number) {
  const K = CROWD_CUES
  const a = win(t, K.public[0], K.public[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HONEST ABOUT IT', 960, 210, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'What is public, what isn’t.', 960, 278, { size: 52, weight: 500, align: 'center', spacing: '-1.5px' })
  const cols = [
    { k: 'PUBLIC ON ETHEREUM', c: C.warn, rgb: WARN_RGB, items: ['each deposit: wallet, amount, time', 'each withdrawal: amount, address, time'] },
    { k: 'NOT PUBLIC', c: C.ok, rgb: OK_RGB, items: ['which note paid for which request', 'your names, files, face, voice (shielded)', 'your IP, if you use Tor'] },
  ]
  cols.forEach((col, i) => {
    const ca = easeOut(prog(t, K.public[0] + 0.3 + i * 0.5, K.public[0] + 0.8 + i * 0.5))
    if (!ca) return
    const x = 260 + i * 720
    ctx.save()
    ctx.globalAlpha *= ca
    panel(ctx, x, 360, 680, 330, 18, C.panel, `rgba(${col.rgb},0.35)`)
    text(ctx, col.k, x + 40, 414, { size: 16, family: MONO, color: col.c, spacing: '0.16em' })
    col.items.forEach((it, k) => {
      const y = 484 + k * 66
      if (i === 1) check(ctx, x + 50, y - 7, 16, C.ok, 2.4)
      else {
        ctx.fillStyle = C.warn
        ctx.beginPath()
        ctx.arc(x + 50, y - 7, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      text(ctx, it, x + 76, y, { size: 24, color: C.soft })
    })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = CROWD_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  icon(ctx, USERS, 960, 320, 120, C.fg, 2)
  text(ctx, 'Privacy is a crowd.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Your Crowd, live in NULL Chat. Look under your balance.', 960, 610, { size: 32, color: C.muted, align: 'center' })
  text(ctx, `${PROJECT.domain}/chat`, 960, 730, { size: 40, family: MONO, color: C.fg, align: 'center' })
  text(ctx, PROJECT.xHandle, 960, 790, { size: 26, family: MONO, color: C.muted, align: 'center' })
  if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 920, { size: 22, family: MONO, color: C.muted, align: 'center' })
  ctx.restore()
}

function softEdges(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(960, 540, 700, 960, 540, 1250)
  g.addColorStop(0, 'rgba(6,6,7,0)')
  g.addColorStop(1, 'rgba(6,6,7,0.7)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1920, 1080)
}

export function drawCrowd(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  crowd(ctx, t)
  app(ctx, t)
  publicScene(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

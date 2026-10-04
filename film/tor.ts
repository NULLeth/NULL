// "NULL + Tor": ~26 s promo. Title → what each layer hides (without Tor the provider
// still sees your IP; with Tor it sees an exit relay) → NULL Chat's Tor check turning
// green → three points → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const TOR_DURATION = 26

export const TOR_CUES = {
  row1: [4.2, 6.0],
  row2: [6.6, 9.4],
  hops: [7.2, 7.9, 8.6],
  click: 11.2,
  open: 11.4,
  checking: 12.6,
  green: 13.4,
  close: 14.6,
  chip: 14.8,
  points: [18.0, 18.9, 19.8],
  end: 21.6,
}

const ETH_RGB = '138,152,255'
const OK_RGB = '67,211,146'
const BAD_RGB = '239,107,107'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'NULL + Tor', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Hide who pays. Hide where you are.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

// ─── what each layer hides ───────────────────────────────────────────────────

function node(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, sub: string) {
  panel(ctx, x - 130, y - 52, 260, 104, 16, C.panel, C.line2)
  text(ctx, label, x, y - 6, { size: 26, weight: 600, align: 'center' })
  text(ctx, sub, x, y + 26, { size: 15, family: MONO, color: C.dim, align: 'center' })
}

function relay(ctx: CanvasRenderingContext2D, x: number, y: number, lit: number) {
  ctx.save()
  for (let r = 3; r >= 1; r--) {
    ctx.beginPath()
    ctx.arc(x, y, 12 + r * 9, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.12 + 0.12 * (4 - r) + 0.3 * lit})`
    ctx.lineWidth = 1.6
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(x, y, 9, 0, Math.PI * 2)
  ctx.fillStyle = lit > 0 ? `rgba(${ETH_RGB},${0.5 + 0.5 * lit})` : C.line3
  ctx.fill()
  if (lit > 0) glow(ctx, x, y, 70, ETH_RGB, 0.25 * lit)
  ctx.restore()
}

function tag(ctx: CanvasRenderingContext2D, x: number, y: number, k: string, v: string, good: boolean, alpha: number) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  const w = measure(ctx, `${k}  ${v}`, { size: 17, family: MONO }) + 58
  ctx.beginPath()
  ctx.roundRect(x, y - 20, w, 38, 10)
  ctx.fillStyle = `rgba(${good ? OK_RGB : BAD_RGB},0.08)`
  ctx.fill()
  ctx.strokeStyle = `rgba(${good ? OK_RGB : BAD_RGB},0.4)`
  ctx.lineWidth = 1.3
  ctx.stroke()
  if (good) check(ctx, x + 20, y - 1, 12, C.ok, 2.2)
  else {
    ctx.strokeStyle = C.bad
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(x + 14, y - 7)
    ctx.lineTo(x + 26, y + 5)
    ctx.moveTo(x + 26, y - 7)
    ctx.lineTo(x + 14, y + 5)
    ctx.stroke()
  }
  text(ctx, k, x + 40, y + 6, { size: 17, family: MONO, color: C.dim })
  text(ctx, v, x + 40 + measure(ctx, `${k}  `, { size: 17, family: MONO }), y + 6, { size: 17, family: MONO, color: good ? C.ok : C.bad })
  ctx.restore()
}

function packet(ctx: CanvasRenderingContext2D, pts: [number, number][], p: number) {
  if (p <= 0 || p >= 1) return
  // position along the polyline
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]))
  let d = lens.reduce((a, b) => a + b, 0) * easeInOut(p)
  let i = 0
  while (i < lens.length - 1 && d > lens[i]) d -= lens[i++]
  const f = lens[i] ? d / lens[i] : 0
  const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f
  const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
  glow(ctx, x, y, 46, ETH_RGB, 0.35)
  ctx.beginPath()
  ctx.roundRect(x - 20, y - 12, 40, 24, 7)
  ctx.fillStyle = C.eth
  ctx.fill()
}

function path(ctx: CanvasRenderingContext2D, pts: [number, number][], reveal: number) {
  ctx.save()
  ctx.setLineDash([6, 8])
  ctx.strokeStyle = C.line3
  ctx.lineWidth = 2
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.globalAlpha *= reveal
  ctx.stroke()
  ctx.restore()
}

function layers(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 10.6, 0.4, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  caption(ctx, 'WHAT THE AI PROVIDER SEES', 'zkAPI hides your wallet. Tor hides your IP.', easeOut(prog(t, 3.2, 3.7)))

  const L = 330
  const R = 1590
  // row 1: without Tor
  const y1 = 400
  const r1 = easeOut(prog(t, 3.5, 4.0))
  text(ctx, 'WITHOUT TOR', L - 130, y1 - 84, { size: 16, family: MONO, color: C.muted, spacing: '0.16em', alpha: r1 })
  ctx.save()
  ctx.globalAlpha *= r1
  const p1: [number, number][] = [
    [L + 130, y1],
    [R - 130, y1],
  ]
  path(ctx, p1, 1)
  node(ctx, L, y1, 'You', 'wallet + home IP')
  node(ctx, R, y1, 'OpenRouter', 'the AI provider')
  packet(ctx, p1, prog(t, TOR_CUES.row1[0], TOR_CUES.row1[1]))
  const s1 = easeOut(prog(t, TOR_CUES.row1[1] - 0.1, TOR_CUES.row1[1] + 0.4))
  tag(ctx, R - 130, y1 + 92, 'wallet', 'hidden', true, s1)
  tag(ctx, R - 130, y1 + 140, 'IP', '95.156.230.•••', false, s1)
  ctx.restore()

  // row 2: with Tor
  const y2 = 760
  const r2 = easeOut(prog(t, 6.2, 6.7))
  text(ctx, 'WITH TOR', L - 130, y2 - 84, { size: 16, family: MONO, color: C.ok, spacing: '0.16em', alpha: r2 })
  ctx.save()
  ctx.globalAlpha *= r2
  const hx = [700, 960, 1220]
  const hy = [y2 - 60, y2 + 50, y2 - 40]
  const p2: [number, number][] = [[L + 130, y2], ...hx.map((x, i) => [x, hy[i]] as [number, number]), [R - 130, y2]]
  path(ctx, p2, 1)
  hx.forEach((x, i) => relay(ctx, x, hy[i], clamp(1 - Math.abs(t - TOR_CUES.hops[i]) / 0.5)))
  text(ctx, '3 Tor relays', 960, y2 + 130, { size: 15, family: MONO, color: C.dim, align: 'center' })
  node(ctx, L, y2, 'You', 'wallet + home IP')
  node(ctx, R, y2, 'OpenRouter', 'the AI provider')
  packet(ctx, p2, prog(t, TOR_CUES.row2[0], TOR_CUES.row2[1]))
  const s2 = easeOut(prog(t, TOR_CUES.row2[1] - 0.1, TOR_CUES.row2[1] + 0.4))
  tag(ctx, R - 130, y2 + 92, 'wallet', 'hidden', true, s2)
  tag(ctx, R - 130, y2 + 140, 'IP', 'a Tor exit', true, s2)
  ctx.restore()
  ctx.restore()
}

function caption(ctx: CanvasRenderingContext2D, label: string, headline: string, alpha: number) {
  if (alpha <= 0) return
  text(ctx, label, 960, 140, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em', alpha })
  text(ctx, headline, 960, 206, { size: 50, weight: 500, color: C.fg, align: 'center', spacing: '-1.5px', alpha })
}

// ─── NULL Chat: the check turns green ────────────────────────────────────────

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 10.3, 17.5, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 10.3, 11.0))) * 30
  const X = 120
  const Y = 90 + rise
  const W = 1680
  const H = 900
  const tor = t >= TOR_CUES.chip
  panel(ctx, X, Y, W, H, 22, C.panel, C.line2)

  // sidebar
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  ctx.fillRect(X + 1, Y + 1, 340, H - 2)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X + 340, Y)
  ctx.lineTo(X + 340, Y + H)
  ctx.stroke()
  nullMark(ctx, X + 44, Y + 46, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 53, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 53, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  panel(ctx, X + 24, Y + 84, 292, 46, 8, C.panel, C.line2)
  text(ctx, '+  NEW CHAT', X + 170, Y + 114, { size: 15, family: MONO, color: C.fg, align: 'center', spacing: '0.12em' })
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 150, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 150, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  text(ctx, '0.049920', X + 28, Y + H - 100, { size: 36, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + H - 100, { size: 16, family: MONO, color: C.muted })
  text(ctx, 'expires Nov 2 · 29 days left', X + 28, Y + H - 66, { size: 13, family: MONO, color: C.dim })

  // top bar
  const M = X + 340
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(M, Y + 76)
  ctx.lineTo(X + W, Y + 76)
  ctx.stroke()
  panel(ctx, M + 28, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, 'Claude Sonnet 5.5  ⌄', M + 46, Y + 46, { size: 16, family: MONO, color: C.fg })
  if (tor) {
    const ca = easeOut(prog(t, TOR_CUES.chip, TOR_CUES.chip + 0.4))
    ctx.save()
    ctx.globalAlpha *= ca
    ctx.beginPath()
    ctx.roundRect(M + 300, Y + 24, 92, 32, 16)
    ctx.strokeStyle = 'rgba(67,211,146,0.45)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    text(ctx, '● TOR', M + 346, Y + 45, { size: 13, family: MONO, color: C.ok, align: 'center', spacing: '0.12em' })
    glow(ctx, M + 346, Y + 40, 80, OK_RGB, 0.18 * (1 - prog(t, TOR_CUES.chip, TOR_CUES.chip + 1.2)))
    ctx.restore()
  }
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  // a finished answer in the conversation
  const CX = M + 120
  const CW = 1060
  const q = 'Is my IP hidden now?'
  const qw = measure(ctx, q, { size: 22 }) + 44
  ctx.beginPath()
  ctx.roundRect(CX + CW - qw, Y + 130, qw, 56, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
  ctx.strokeStyle = C.line2
  ctx.stroke()
  text(ctx, q, CX + CW - qw + 22, Y + 166, { size: 22, color: C.fg })
  panel(ctx, CX, Y + 224, 40, 40, 8, C.panel, C.line2)
  nullMark(ctx, CX + 20, Y + 244, 8, 1, 1, 2.5)
  text(ctx, 'NULL never sees your wallet when you pay. Run it through Tor', CX + 70, Y + 254, { size: 24, color: C.soft })
  text(ctx, 'and the provider stops seeing your IP too.', CX + 70, Y + 294, { size: 24, color: C.soft })
  const m1 = `Claude Sonnet 5.5 · 2.6s · `
  text(ctx, m1, CX + 70, Y + 340, { size: 15, family: MONO, color: C.dim })
  const w1 = measure(ctx, m1, { size: 15, family: MONO })
  text(ctx, 'paid privately', CX + 70 + w1, Y + 340, { size: 15, family: MONO, color: C.ok })
  check(ctx, CX + 70 + w1 + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, Y + 335, 13, C.ok, 2.2)

  // composer + the privacy line
  panel(ctx, CX, Y + H - 120, CW, 62, 14, C.panel, C.line2)
  text(ctx, 'Ask privately…', CX + 24, Y + H - 80, { size: 22, color: C.dim })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, Y + H - 111, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, Y + H - 80, { size: 24, weight: 600, color: C.bg, align: 'center' })
  const LY = Y + H - 28
  const lead = 'payment identity hidden · the model provider reads your prompt · '
  const tail = tor ? 'Tor ✓ your IP is hidden too' : 'your IP is visible to OpenRouter · hide it with Tor'
  const full = measure(ctx, lead + tail, { size: 14, family: MONO })
  const lx = CX + CW / 2 - full / 2
  text(ctx, 'payment identity hidden', lx, LY, { size: 14, family: MONO, color: C.ok })
  text(ctx, lead.slice('payment identity hidden'.length), lx + measure(ctx, 'payment identity hidden', { size: 14, family: MONO }), LY, { size: 14, family: MONO, color: C.dim })
  const tx = lx + measure(ctx, lead, { size: 14, family: MONO })
  if (tor) text(ctx, tail, tx, LY, { size: 14, family: MONO, color: C.ok })
  else {
    const vis = 'your IP is visible to OpenRouter · '
    text(ctx, vis, tx, LY, { size: 14, family: MONO, color: C.dim })
    const hx = tx + measure(ctx, vis, { size: 14, family: MONO })
    text(ctx, 'hide it with Tor', hx, LY, { size: 14, family: MONO, color: C.fg })
    const hw = measure(ctx, 'hide it with Tor', { size: 14, family: MONO })
    ctx.fillStyle = C.line3
    ctx.fillRect(hx, LY + 4, hw, 1.5)
    const pulse = prog(t, TOR_CUES.click - 0.1, TOR_CUES.click + 0.5)
    if (pulse > 0 && pulse < 1) {
      ctx.beginPath()
      ctx.roundRect(hx - 8 - pulse * 10, LY - 18 - pulse * 8, hw + 16 + pulse * 20, 28 + pulse * 16, 8)
      ctx.strokeStyle = `rgba(${ETH_RGB},${0.6 * (1 - pulse)})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // the Tor window
  const ma = t >= TOR_CUES.open && t < TOR_CUES.close + 0.3 ? easeOut(prog(t, TOR_CUES.open, TOR_CUES.open + 0.3)) * (1 - prog(t, TOR_CUES.close, TOR_CUES.close + 0.3)) : 0
  if (ma > 0) {
    ctx.save()
    ctx.globalAlpha *= ma
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(X, Y, W, H)
    const MX = 560
    const MY = Y + 150 + (1 - ma) * 20
    panel(ctx, MX, MY, 800, 470, 18, C.panel2, C.line3)
    text(ctx, 'PRIVACY · NETWORK', MX + 36, MY + 52, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, 'Use NULL over Tor', MX + 36, MY + 96, { size: 34, weight: 600, spacing: '-1px' })
    text(ctx, 'zkAPI hides who pays. Tor hides where you connect from.', MX + 36, MY + 150, { size: 20, color: C.muted })
    const green = t >= TOR_CUES.green
    const checking = t >= TOR_CUES.checking && !green
    ctx.beginPath()
    ctx.roundRect(MX + 36, MY + 186, 728, 84, 12)
    ctx.fillStyle = green ? 'rgba(67,211,146,0.07)' : 'rgba(255,255,255,0.02)'
    ctx.fill()
    ctx.strokeStyle = green ? 'rgba(67,211,146,0.4)' : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (checking) {
      spinner(ctx, MX + 70, MY + 228, 10, t)
      text(ctx, 'Checking your connection…', MX + 96, MY + 235, { size: 19, color: C.soft })
    } else if (green) {
      doneDot(ctx, MX + 70, MY + 228, 13)
      text(ctx, 'You’re on Tor.', MX + 96, MY + 223, { size: 19, color: C.ok })
      text(ctx, 'OpenRouter and NULL see a Tor exit (109.70.100.•••), not you.', MX + 96, MY + 252, { size: 17, color: C.soft })
    } else {
      text(ctx, 'Not on Tor.', MX + 70, MY + 223, { size: 19, color: C.fg })
      text(ctx, 'Your IP (95.156.230.•••) is visible to OpenRouter.', MX + 70, MY + 252, { size: 17, color: C.soft })
    }
    const steps = ['Your browser through Tor  (keeps your wallet)', 'On your phone: Orbot', 'Tor Browser on its own']
    steps.forEach((s, i) => {
      panel(ctx, MX + 36, MY + 290 + i * 52, 728, 42, 10, 'rgba(255,255,255,0.015)', C.line)
      text(ctx, `0${i + 1}`, MX + 56, MY + 317 + i * 52, { size: 14, family: MONO, color: C.dim })
      text(ctx, s, MX + 92, MY + 317 + i * 52, { size: 17, color: C.soft })
    })
    ctx.restore()
  }
  ctx.restore()
}

const POINTS = [
  { k: 'Your wallet: hidden.', v: 'zkAPI pays with a zero-knowledge proof.' },
  { k: 'Your IP: hidden.', v: 'Tor sends your request through three relays.' },
  { k: 'Check it in one click.', v: 'NULL Chat shows TOR ✓ when you’re covered.' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 17.4, TOR_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'TWO LAYERS', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, TOR_CUES.points[i], TOR_CUES.points[i] + 0.5))
    if (!pa) return
    const y = 360 + i * 190 - (1 - pa) * 16
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, 360, y - 70, 1200, 150, 18, C.panel, C.line2)
    doneDot(ctx, 430, y - 2, 20)
    text(ctx, p.k, 480, y - 8, { size: 40, weight: 600, spacing: '-1px' })
    text(ctx, p.v, 480, y + 40, { size: 26, color: C.muted })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const a = easeOut(prog(t, TOR_CUES.end + 0.1, TOR_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'NULL now works with Tor.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Hide who pays. Hide where you are.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawTor(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  layers(ctx, t)
  app(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

// "Compare": ~26 s promo. Title → NULL Chat with COMPARE on: one question, Claude and
// Grok answer side by side, each with its time and cost → three points → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win, wrap } from './kit'

export const COMPARE_DURATION = 26

export const COMPARE_CUES = {
  toggle: 4.0,
  typeStart: 4.7,
  typeEnd: 6.4,
  send: 6.7,
  streamA: [7.6, 12.0],
  streamB: [7.3, 10.6],
  points: [16.9, 17.8, 18.7],
  end: 20.8,
}

const ETH_RGB = '138,152,255'
const PROMPT = 'Explain zero-knowledge proofs in three sentences.'
const A = {
  model: 'Claude Sonnet 5.5',
  secs: '4.4s',
  cost: '0.21¢',
  text: 'A zero-knowledge proof lets you convince someone that a statement is true without showing why it is true. You prove you know a secret, like a password or a valid balance, while the secret itself stays hidden. NULL uses this to prove you can pay without revealing your wallet.',
}
const B = {
  model: 'Grok 4.7',
  secs: '3.3s',
  cost: '0.12¢',
  text: 'Think of showing the bouncer you are over 18 without handing over your ID. The math checks out and the bouncer learns nothing else. That is how NULL pays for your AI without saying who you are.',
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Compare models', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Ask two AIs at once. See what every answer cost.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function columnsIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(cx - s, cy - s * 0.8, s * 2, s * 1.6, 3)
  ctx.moveTo(cx, cy - s * 0.8)
  ctx.lineTo(cx, cy + s * 0.8)
  ctx.stroke()
  ctx.restore()
}

function pane(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ans: typeof A, span: number[], t: number) {
  panel(ctx, x, y, w, h, 16, 'rgba(255,255,255,0.02)', C.line2)
  text(ctx, ans.model, x + 22, y + 38, { size: 17, family: MONO, color: C.fg })
  const done = t >= span[1]
  const ca = easeOut(prog(t, span[1], span[1] + 0.4))
  if (ca > 0) {
    ctx.save()
    ctx.globalAlpha *= ca
    const cw = measure(ctx, ans.cost, { size: 17, family: MONO }) + 22
    ctx.beginPath()
    ctx.roundRect(x + w - 22 - cw, y + 18, cw, 30, 8)
    ctx.fillStyle = `rgba(${ETH_RGB},${0.08 + 0.12 * (1 - prog(t, span[1] + 0.4, span[1] + 1.6))})`
    ctx.fill()
    text(ctx, ans.cost, x + w - 33, y + 38, { size: 17, family: MONO, color: C.fg, align: 'right' })
    ctx.restore()
  }
  if (t < span[0]) {
    spinner(ctx, x + 32, y + 84, 9, t)
    text(ctx, 'Routing privately…', x + 54, y + 90, { size: 16, family: MONO, color: C.soft })
    return
  }
  const chars = Math.floor(prog(t, span[0], span[1]) * ans.text.length)
  const lines = wrap(ctx, ans.text.slice(0, chars), w - 44, { size: 21 })
  lines.forEach((ln, i) => text(ctx, ln, x + 22, y + 92 + i * 34, { size: 21, color: C.soft }))
  if (!done && Math.floor(t * 3) % 2 === 0) {
    const last = lines[lines.length - 1] ?? ''
    ctx.fillStyle = C.eth
    ctx.fillRect(x + 26 + measure(ctx, last, { size: 21 }), y + 92 + (lines.length - 1) * 34 - 19, 8, 24)
  }
  if (done) {
    const ma = easeOut(prog(t, span[1], span[1] + 0.4))
    ctx.save()
    ctx.globalAlpha *= ma
    const my = y + h - 26
    const m1 = `${ans.secs} · `
    text(ctx, m1, x + 22, my, { size: 14, family: MONO, color: C.dim })
    const w1 = measure(ctx, m1, { size: 14, family: MONO })
    text(ctx, 'paid by proof', x + 22 + w1, my, { size: 14, family: MONO, color: C.ok })
    check(ctx, x + 22 + w1 + measure(ctx, 'paid by proof', { size: 14, family: MONO }) + 12, my - 5, 11, C.ok, 2)
    ctx.restore()
  }
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 16.3, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  const X = 120
  const Y = 90 + rise
  const W = 1680
  const H = 900
  panel(ctx, X, Y, W, H, 22, C.panel, C.line2)

  // sidebar
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  ctx.fillRect(X + 1, Y + 1, 300, H - 2)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X + 300, Y)
  ctx.lineTo(X + 300, Y + H)
  ctx.stroke()
  nullMark(ctx, X + 44, Y + 46, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 53, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 53, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  panel(ctx, X + 24, Y + 84, 252, 46, 8, C.panel, C.line2)
  text(ctx, '+  NEW CHAT', X + 150, Y + 114, { size: 15, family: MONO, color: C.fg, align: 'center', spacing: '0.12em' })
  if (t >= COMPARE_CUES.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 268, 64, 8)
    ctx.fill()
    text(ctx, 'Explain zero-knowledge…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Claude vs Grok · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  }
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  const bal = 0.05 - 0.0000009 * (easeOut(prog(t, COMPARE_CUES.streamA[1], COMPARE_CUES.streamA[1] + 1)) + easeOut(prog(t, COMPARE_CUES.streamB[1], COMPARE_CUES.streamB[1] + 1)))
  text(ctx, bal.toFixed(7), X + 28, Y + H - 80, { size: 32, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + H - 80, { size: 15, family: MONO, color: C.muted })

  // top bar with the two pickers
  const M = X + 300
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(M, Y + 76)
  ctx.lineTo(X + W, Y + 76)
  ctx.stroke()
  panel(ctx, M + 28, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, 'Claude Sonnet 5.5  ⌄', M + 46, Y + 46, { size: 16, family: MONO, color: C.fg })
  const va = easeOut(prog(t, COMPARE_CUES.toggle, COMPARE_CUES.toggle + 0.4))
  if (va > 0) {
    ctx.save()
    ctx.globalAlpha *= va
    text(ctx, 'vs', M + 300, Y + 46, { size: 15, family: MONO, color: C.dim })
    panel(ctx, M + 332, Y + 20, 190, 40, 8, C.panel, 'rgba(138,152,255,0.4)')
    text(ctx, 'Grok 4.7  ⌄', M + 350, Y + 46, { size: 16, family: MONO, color: C.fg })
    ctx.restore()
  }
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  // conversation
  const CX = M + 50
  const CW = X + W - CX - 50
  if (t >= COMPARE_CUES.send) {
    const ua = easeOut(prog(t, COMPARE_CUES.send, COMPARE_CUES.send + 0.3))
    const w = measure(ctx, PROMPT, { size: 22 }) + 44
    ctx.save()
    ctx.globalAlpha *= ua
    ctx.beginPath()
    ctx.roundRect(CX + CW - w, Y + 110, w, 56, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, PROMPT, CX + CW - w + 22, Y + 146, { size: 22, color: C.fg })
    ctx.restore()
    const PW = (CW - 20) / 2
    const PY = Y + 196
    const PH = 330
    pane(ctx, CX, PY, PW, PH, A, COMPARE_CUES.streamA, t)
    pane(ctx, CX + PW + 20, PY, PW, PH, B, COMPARE_CUES.streamB, t)
    const ba = easeOut(prog(t, COMPARE_CUES.streamA[1] + 0.4, COMPARE_CUES.streamA[1] + 0.9))
    if (ba > 0) {
      text(ctx, 'both answers 0.33¢ · paid from your private balance', CX, PY + PH + 38, { size: 15, family: MONO, color: C.dim, alpha: ba })
    }
  }

  // composer with COMPARE
  const BY = Y + H - 120
  panel(ctx, CX, BY, CW, 62, 14, C.panel, C.line2)
  const on = t >= COMPARE_CUES.toggle
  const btn = (bx: number, w: number, label: string, active: boolean, icon = false) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 9, w, 44, 10)
    ctx.fillStyle = active ? 'rgba(138,152,255,0.12)' : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = active ? 'rgba(138,152,255,0.5)' : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (icon) columnsIcon(ctx, bx + 24, BY + 31, 9, active ? C.eth : C.dim)
    text(ctx, label, icon ? bx + 42 : bx + w / 2, BY + 37, { size: 14, family: MONO, color: active ? C.eth : C.dim, align: icon ? 'left' : 'center', spacing: '0.08em' })
  }
  btn(CX + 10, 74, 'WEB', false)
  btn(CX + 92, 92, 'IMAGE', false)
  btn(CX + 192, 104, 'SHIELD', false)
  btn(CX + 304, 132, 'COMPARE', on, true)
  const pulse = prog(t, COMPARE_CUES.toggle - 0.05, COMPARE_CUES.toggle + 0.6)
  if (pulse > 0 && pulse < 1) {
    ctx.beginPath()
    ctx.roundRect(CX + 304 - pulse * 14, BY + 9 - pulse * 14, 132 + pulse * 28, 44 + pulse * 28, 10 + pulse * 10)
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.5 * (1 - pulse)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  const TX = CX + 456
  const typed = t < COMPARE_CUES.send ? PROMPT.slice(0, Math.floor(prog(t, COMPARE_CUES.typeStart, COMPARE_CUES.typeEnd) * PROMPT.length)) : ''
  text(ctx, typed || 'Ask privately…', TX, BY + 40, { size: 20, color: typed ? C.fg : C.dim })
  if (t < COMPARE_CUES.send && t > COMPARE_CUES.typeStart && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(TX + 2 + measure(ctx, typed, { size: 20 }), BY + 19, 3, 26)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 9, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 40, { size: 24, weight: 600, color: C.bg, align: 'center' })
  ctx.restore()
}

const POINTS = [
  { k: 'Two models, one question.', v: 'Pick any two of the 12 and compare side by side.' },
  { k: 'See what every answer cost.', v: 'Usually a fraction of a cent, shown under each answer.' },
  { k: 'Still private.', v: 'Both paid from your private balance with a proof.' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 16.3, COMPARE_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'ONE SWITCH: COMPARE', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, COMPARE_CUES.points[i], COMPARE_CUES.points[i] + 0.5))
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
  const a = easeOut(prog(t, COMPARE_CUES.end + 0.1, COMPARE_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Compare. Pay cents. Stay private.', 960, 540, { size: 78, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Now live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawCompare(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

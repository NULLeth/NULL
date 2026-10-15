// "Private Memory": ~28 s promo. Title → the notes, saved in this browser → a question is typed,
// the small model in the browser scans the notes and picks three → what actually leaves the
// browser (the three notes with placeholders, five stay behind) → the answer with names filled
// back in → three points → end card. Notes, picks and placeholders are what NULL Chat produced
// in the test (gte-small, "Plan three dinners for this week. Lena joins on Friday.").

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const MEMORY_DURATION = 28

export const MEMORY_CUES = {
  notes: 3.4,
  typeStart: 5.0,
  typeEnd: 7.6,
  scan: [7.9, 9.4],
  picks: [8.4, 8.8, 9.2],
  bar: 9.6,
  send: 11.2,
  wire: [12.0, 18.4],
  stay: 14.6,
  answer: [18.2, 23.0],
  points: [23.6, 24.0, 24.4],
  end: 25.6,
}

const ETH_RGB = '138,152,255'
const OK_RGB = '67,211,146'
const BRAIN = new Path2D(
  'M12 18V5 M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4 M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5 M17.997 5.125a4 4 0 0 1 2.526 5.77 M18 18a4 4 0 0 0 2-7.464 M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517 M6 18a4 4 0 0 1-2-7.464 M6.003 5.125a4 4 0 0 0-2.526 5.77',
)
const LOCK = new Path2D('M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4')

const Q = 'Plan three dinners for this week. Lena joins on Friday.'
const Q_WIRE = 'Plan three dinners for this week. [NAME_1] joins on Friday.'
/** the notes, newest first; `pick` = order picked, `fit` = the dots shown */
const NOTES: { text: string; wire?: string; pick?: number; fit?: number }[] = [
  { text: 'My laptop is a 2021 MacBook Air.' },
  { text: 'My daughter Mia is 7 and loves dinosaurs.', wire: 'My daughter [NAME_2] is 7 and loves dinosaurs.', pick: 1, fit: 2 },
  { text: 'I hold ETH and some stablecoins, long term.' },
  { text: 'I’m learning Spanish, around A2 level.' },
  { text: 'I work as a nurse, mostly night shifts.' },
  { text: 'I’m allergic to peanuts.' },
  { text: 'I live in Berlin with my partner Lena.', wire: 'I live in [PLACE_1] with my partner [NAME_1].', pick: 0, fit: 3 },
  { text: 'I’m vegetarian.', pick: 2, fit: 1 },
]
const WENT = '3 notes from your memory went along'
const PICKED = NOTES.filter((n) => n.pick != null).sort((a, b) => a.pick! - b.pick!)
const STAYED = NOTES.filter((n) => n.pick == null)
const ANSWER = [
  'Three vegetarian dinners for your week:',
  '1.  Monday: lentil bolognese with spaghetti',
  '2.  Wednesday: chickpea curry with rice',
  '3.  Friday with Lena: homemade veggie pizza.',
  '     Let Mia pick the toppings, dinosaur shapes welcome.',
]

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

function pointer(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + 30)
  ctx.lineTo(x + 8, y + 23)
  ctx.lineTo(x + 14, y + 36)
  ctx.lineTo(x + 19, y + 34)
  ctx.lineTo(x + 13, y + 21)
  ctx.lineTo(x + 23, y + 21)
  ctx.closePath()
  ctx.fillStyle = C.fg
  ctx.fill()
  ctx.strokeStyle = C.bg
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

/** text where [TAGS] are drawn as small eth pills */
function tagged(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, mono = false) {
  let cx = x
  for (const part of s.split(/(\[[A-Z]+_\d+\])/)) {
    if (!part) continue
    if (/^\[[A-Z]+_\d+\]$/.test(part)) {
      const w = measure(ctx, part, { size: size * 0.9, family: MONO })
      ctx.fillStyle = `rgba(${ETH_RGB},0.14)`
      ctx.beginPath()
      ctx.roundRect(cx - 2, y - size * 0.85, w + 4, size * 1.2, 4)
      ctx.fill()
      cx += text(ctx, part, cx, y, { size: size * 0.9, family: MONO, color: C.eth }) + 2
    } else cx += text(ctx, part, cx, y, { size, color, ...(mono ? { family: MONO } : {}) })
  }
}

function dots(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, alpha: number) {
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(x + i * 14, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = i < n ? `rgba(${ETH_RGB},${alpha})` : `rgba(255,255,255,${0.12 * alpha})`
    ctx.fill()
  }
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.4, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, ETH_RGB, 0.08)
  const s = easeOut(prog(t, 0.2, 1.0))
  icon(ctx, BRAIN, 960, 410, 140 * s + 1, C.fg, 2)
  text(ctx, 'Private Memory', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'NULL remembers you. Only in your browser.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

/** the app: memory panel on the right, chat with composer on the left */
function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = MEMORY_CUES
  const a = win(t, 3.1, K.wire[0] + 0.3, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 120
  const Y = 90 + (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  panel(ctx, X, Y, 1680, 900, 22, C.panel, C.line2)

  // chat side
  nullMark(ctx, X + 44, Y + 46, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 53, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 53, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, 'Ask privately.', X + 470, Y + 330, { size: 46, weight: 500, align: 'center', spacing: '-1.5px', color: C.fg })
  text(ctx, 'Each chat is paid with a zero-knowledge proof.', X + 470, Y + 380, { size: 19, color: C.muted, align: 'center' })

  // composer + memory bar
  const CX = X + 40
  const CW = 860
  const CY = Y + 780
  const bar = easeOut(prog(t, K.bar, K.bar + 0.4))
  if (bar > 0 && t < K.send + 0.2) {
    ctx.save()
    ctx.globalAlpha *= bar
    icon(ctx, BRAIN, CX + 10, CY - 112, 16, C.eth, 2)
    text(ctx, 'MEMORY', CX + 26, CY - 106, { size: 14, family: MONO, color: C.eth, spacing: '0.12em' })
    text(ctx, '3 notes go along', CX + 112, CY - 106, { size: 14, family: MONO, color: C.dim })
    let x = CX
    PICKED.forEach((n, i) => {
      const label = n.text.length > 30 ? `${n.text.slice(0, 29)}…` : n.text
      const w = measure(ctx, label, { size: 14, family: MONO }) + 20
      const rowY = CY - 86 + (x + w > CX + CW ? 34 : 0)
      if (x + w > CX + CW) x = CX
      const ca = easeOut(prog(t, K.bar + 0.1 * i, K.bar + 0.1 * i + 0.3))
      ctx.save()
      ctx.globalAlpha *= ca
      ctx.fillStyle = `rgba(${ETH_RGB},0.08)`
      ctx.strokeStyle = `rgba(${ETH_RGB},0.4)`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.roundRect(x, rowY, w, 26, 6)
      ctx.fill()
      ctx.stroke()
      text(ctx, label, x + 10, rowY + 18, { size: 14, family: MONO, color: C.eth })
      ctx.restore()
      x += w + 8
    })
    ctx.restore()
  }
  panel(ctx, CX, CY, CW, 70, 14, C.panel2, C.line3)
  const n = Math.floor(prog(t, K.typeStart, K.typeEnd) * Q.length)
  const typed = t >= K.send ? '' : Q.slice(0, n)
  if (typed) text(ctx, typed, CX + 24, CY + 43, { size: 20, color: C.fg })
  else text(ctx, 'Ask privately…', CX + 24, CY + 43, { size: 20, color: C.dim })
  if (t > K.typeStart && t < K.send && Math.floor(t * 2.4) % 2 === 0) {
    const cw = typed ? measure(ctx, typed, { size: 20 }) : 0
    ctx.fillStyle = C.eth
    ctx.fillRect(CX + 26 + cw, CY + 24, 2, 26)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 60, CY + 14, 42, 42, 9)
  ctx.fillStyle = C.fg
  ctx.fill()
  ctx.strokeStyle = C.bg
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(CX + CW - 39, CY + 46)
  ctx.lineTo(CX + CW - 39, CY + 25)
  ctx.moveTo(CX + CW - 47, CY + 33)
  ctx.lineTo(CX + CW - 39, CY + 25)
  ctx.lineTo(CX + CW - 31, CY + 33)
  ctx.stroke()
  // sent: the question bubble appears at the top
  const sent = easeOut(prog(t, K.send + 0.1, K.send + 0.5))
  if (sent > 0) {
    ctx.save()
    ctx.globalAlpha *= sent
    const qw = measure(ctx, Q, { size: 19 }) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 110, qw, 48, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, Q, CX + CW - qw + 22, Y + 141, { size: 19, color: C.fg })
    const mw = measure(ctx, WENT, { size: 13, family: MONO })
    icon(ctx, BRAIN, CX + CW - mw - 14, Y + 180, 13, C.eth, 2)
    text(ctx, WENT, CX + CW, Y + 185, { size: 13, family: MONO, color: C.eth, align: 'right' })
    ctx.restore()
  }

  // memory panel
  const MX = X + 980
  const MY = Y + 40
  const MW = 660
  const pa = easeOut(prog(t, K.notes, K.notes + 0.5))
  ctx.save()
  ctx.globalAlpha *= pa
  panel(ctx, MX, MY, MW, 820, 18, 'rgba(255,255,255,0.015)', C.line2)
  icon(ctx, BRAIN, MX + 40, MY + 46, 22, C.eth, 2)
  text(ctx, 'YOUR MEMORY', MX + 62, MY + 53, { size: 16, family: MONO, color: C.soft, spacing: '0.16em' })
  text(ctx, '8 notes', MX + MW - 32, MY + 53, { size: 15, family: MONO, color: C.dim, align: 'right' })
  ctx.fillStyle = `rgba(${OK_RGB},0.06)`
  ctx.beginPath()
  ctx.roundRect(MX + 28, MY + 78, MW - 56, 40, 8)
  ctx.fill()
  icon(ctx, LOCK, MX + 50, MY + 98, 15, C.ok, 2)
  text(ctx, 'saved in this browser only, never on a server', MX + 68, MY + 104, { size: 14, family: MONO, color: C.ok })

  const scanY = prog(t, K.scan[0], K.scan[1])
  NOTES.forEach((note, i) => {
    const ny = MY + 146 + i * 80
    const appear = easeOut(prog(t, K.notes + 0.15 + i * 0.07, K.notes + 0.45 + i * 0.07))
    if (!appear) return
    const picked = note.pick != null ? easeOut(prog(t, K.picks[note.pick], K.picks[note.pick] + 0.3)) : 0
    const dim = t > K.scan[1] && note.pick == null ? 0.45 : 1
    ctx.save()
    ctx.globalAlpha *= appear * dim
    panel(ctx, MX + 28, ny + (1 - appear) * 10, MW - 56, 64, 10, picked ? `rgba(${ETH_RGB},${0.08 * picked})` : C.panel, picked ? `rgba(${ETH_RGB},${0.2 + 0.35 * picked})` : C.line2)
    text(ctx, note.text, MX + 50, ny + 39, { size: 19, color: picked ? C.fg : C.soft })
    if (note.fit && picked) dots(ctx, MX + MW - 88, ny + 33, note.fit, picked)
    ctx.restore()
  })
  // the scan line
  if (t > K.scan[0] && t < K.scan[1] + 0.2) {
    const sy = MY + 146 + scanY * (NOTES.length * 80 - 16)
    const sa = win(t, K.scan[0], K.scan[1] + 0.2, 0.15, 0.25)
    const g = ctx.createLinearGradient(0, sy - 30, 0, sy + 4)
    g.addColorStop(0, `rgba(${ETH_RGB},0)`)
    g.addColorStop(1, `rgba(${ETH_RGB},${0.22 * sa})`)
    ctx.fillStyle = g
    ctx.fillRect(MX + 28, sy - 30, MW - 56, 34)
    ctx.fillStyle = `rgba(${ETH_RGB},${0.9 * sa})`
    ctx.fillRect(MX + 28, sy + 2, MW - 56, 2)
    text(ctx, 'a 34 MB AI in your browser picks what fits', MX + MW / 2, MY + 800, { size: 14, family: MONO, color: C.eth, align: 'center', alpha: sa })
  }
  ctx.restore()

  // pointer: to send
  const sendAt = { x: CX + CW - 39, y: CY + 35 }
  const e = easeInOut(prog(t, K.send - 1.0, K.send - 0.1))
  pointer(ctx, 620 + (sendAt.x - 620) * e, 600 + (sendAt.y - 600) * e, win(t, K.send - 1.1, K.send + 0.4, 0.2, 0.25))
  const r = prog(t, K.send, K.send + 0.45)
  if (r > 0 && r < 1) {
    ctx.beginPath()
    ctx.arc(sendAt.x, sendAt.y, 8 + r * 26, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.6 * (1 - r)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()
}

/** what actually leaves the browser */
function wire(ctx: CanvasRenderingContext2D, t: number) {
  const K = MEMORY_CUES
  const a = win(t, K.wire[0], K.wire[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHAT LEAVES YOUR BROWSER', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Only the notes that fit, with names hidden.', 960, 218, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })

  const X = 160
  const Y = 290
  const W = 980
  panel(ctx, X, Y, W, 600, 18, C.panel, C.line2)
  text(ctx, 'THE REQUEST · WHAT THE AI SEES', X + 40, Y + 50, { size: 14, family: MONO, color: C.dim, spacing: '0.14em' })
  const lines: { s: string; color: string; at: number }[] = [
    { s: '<memory>', color: C.dim, at: 0.3 },
    ...PICKED.map((n, i) => ({ s: `- ${n.wire ?? n.text}`, color: C.soft, at: 0.6 + i * 0.35 })),
    { s: '</memory>', color: C.dim, at: 1.7 },
    { s: '', color: C.soft, at: 1.8 },
    { s: Q_WIRE, color: C.fg, at: 2.0 },
  ]
  lines.forEach((l, i) => {
    const la = easeOut(prog(t, K.wire[0] + l.at, K.wire[0] + l.at + 0.35))
    if (!la || !l.s) return
    ctx.save()
    ctx.globalAlpha *= la
    tagged(ctx, l.s, X + 40, Y + 120 + i * 58, 22, l.color, true)
    ctx.restore()
  })
  const fa = easeOut(prog(t, K.wire[0] + 2.6, K.wire[0] + 3.1))
  check(ctx, X + 52, Y + 553, 14, C.ok, 2.4)
  text(ctx, 'paid by proof · names and places become placeholders', X + 74, Y + 560, { size: 17, family: MONO, color: C.ok, alpha: fa })

  // the notes that stayed
  const SX = X + W + 40
  const SW = 1920 - 160 - SX
  const sa = easeOut(prog(t, K.stay, K.stay + 0.5))
  ctx.save()
  ctx.globalAlpha *= sa
  panel(ctx, SX, Y, SW, 600, 18, `rgba(${OK_RGB},0.03)`, `rgba(${OK_RGB},0.3)`)
  icon(ctx, LOCK, SX + 48, Y + 44, 18, C.ok, 2)
  text(ctx, 'STAYED IN THIS BROWSER', SX + 70, Y + 50, { size: 14, family: MONO, color: C.ok, spacing: '0.14em' })
  STAYED.forEach((n, i) => {
    const ia = easeOut(prog(t, K.stay + 0.2 + i * 0.15, K.stay + 0.5 + i * 0.15))
    const label = n.text.length > 46 ? `${n.text.slice(0, 45)}…` : n.text
    text(ctx, label, SX + 40, Y + 122 + i * 66, { size: 20, color: C.muted, alpha: ia })
  })
  text(ctx, 'never sent', SX + 40, Y + 560, { size: 17, family: MONO, color: C.ok, alpha: easeOut(prog(t, K.stay + 1.2, K.stay + 1.6)) })
  ctx.restore()
  ctx.restore()
}

/** the answer, names filled back in by the browser */
function answer(ctx: CanvasRenderingContext2D, t: number) {
  const K = MEMORY_CUES
  const a = win(t, K.answer[0], K.answer[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'THE ANSWER', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  const X = 300
  const Y = 200 - (1 - easeOut(prog(t, K.answer[0], K.answer[0] + 0.6))) * 20
  const W = 1320
  panel(ctx, X, Y, W, 700, 20, C.panel, C.line2)
  const qw = measure(ctx, Q, { size: 20 }) + 44
  ctx.beginPath()
  ctx.roundRect(X + W - 40 - qw, Y + 46, qw, 50, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
  ctx.strokeStyle = C.line2
  ctx.stroke()
  text(ctx, Q, X + W - 40 - qw + 22, Y + 78, { size: 20, color: C.fg })
  const mw = measure(ctx, WENT, { size: 14, family: MONO })
  icon(ctx, BRAIN, X + W - 40 - mw - 15, Y + 122, 14, C.eth, 2)
  text(ctx, WENT, X + W - 40, Y + 127, { size: 14, family: MONO, color: C.eth, align: 'right' })
  panel(ctx, X + 40, Y + 170, 42, 42, 8, C.panel, C.line2)
  nullMark(ctx, X + 61, Y + 191, 8, 1, 1, 2.5)
  ANSWER.forEach((l, i) => {
    const la = easeOut(prog(t, K.answer[0] + 0.4 + i * 0.25, K.answer[0] + 0.7 + i * 0.25))
    text(ctx, l, X + 112, Y + 200 + i * 56, { size: i === 0 ? 26 : 25, color: i === 0 ? C.fg : C.soft, alpha: la })
  })
  const ma = easeOut(prog(t, K.answer[0] + 1.9, K.answer[0] + 2.4))
  text(ctx, 'Claude Sonnet 5.5 · shield · paid by proof ✓', X + 112, Y + 500, { size: 15, family: MONO, color: C.dim, alpha: ma })
  ctx.save()
  ctx.globalAlpha *= easeOut(prog(t, K.answer[0] + 2.4, K.answer[0] + 2.9))
  panel(ctx, X + 40, Y + 560, W - 80, 96, 14, `rgba(${OK_RGB},0.04)`, `rgba(${OK_RGB},0.3)`)
  tagged(ctx, 'The AI wrote [NAME_1] and [NAME_2]. Your browser filled in Lena and Mia.', X + 72, Y + 618, 21, C.ok)
  ctx.restore()
  ctx.restore()
}

const POINTS = [
  { k: 'PICKED ON YOUR DEVICE', v: 'a 34 MB AI in your browser' },
  { k: 'ONLY WHAT FITS', v: 'up to 3 notes, names hidden' },
  { k: 'NEVER IN A SEARCH', v: 'web and research skip memory' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const K = MEMORY_CUES
  const a = win(t, 23.2, K.end, 0.4, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, K.points[i] - 0.3, K.points[i] + 0.1))
    if (!pa) return
    const x = 120 + i * 570
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, 420 - (1 - pa) * 14, 540, 220, 18, C.panel, `rgba(${ETH_RGB},0.35)`)
    text(ctx, p.k, x + 36, 486, { size: 16, family: MONO, color: C.eth, spacing: '0.16em' })
    text(ctx, p.v, x + 36, 566, { size: 30, color: C.fg })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = MEMORY_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.07)
  icon(ctx, BRAIN, 960, 320, 120, C.fg, 2)
  text(ctx, 'Memory that stays with you.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private Memory, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawMemory(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  wire(ctx, t)
  answer(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

// "Private Read Aloud": ~27 s promo. Title → the browser's voices: on-device ones are offered,
// cloud ones hidden → an answer read out with "listen", sentence by sentence, progress bar →
// the voice loop (Whisper in, on-device voice out, only text goes to the AI) → three points →
// end card. Voice names are the ones this test machine has plus typical cloud voices.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const READ_DURATION = 27

export const READ_CUES = {
  voices: [3.5, 9.0],
  local: [4.0, 4.3, 4.6],
  cloud: [5.4, 5.8],
  hide: 6.6,
  chat: [8.8, 17.4],
  listen: 11.0,
  reading: [11.2, 16.4],
  loop: [17.2, 22.4],
  steps: [17.8, 18.4, 19.0, 19.6, 20.2],
  points: [22.8, 23.2, 23.6],
  end: 25.0,
}

const OK_RGB = '67,211,146'
const BAD_RGB = '239,107,107'
const SPEAKER = new Path2D('M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z M16 9a5 5 0 0 1 0 6 M19.364 18.364a9 9 0 0 0 0-12.728')
const CLOUD_OFF = new Path2D('M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057 M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78 m2 2 20 20')

const LOCAL = ['Microsoft David · en-US', 'Microsoft Mark · en-US', 'Microsoft Zira · en-US']
const CLOUD = ['Google US English', 'Microsoft Aria Online (Natural)']
const Q = 'Explain Ethereum blobs in simple terms.'
const ANSWER = [
  'Blobs are a cheap place for rollups to post their data.',
  'They live on Ethereum for about 18 days, then they are deleted.',
  'Because nodes keep them only for a while, they cost far less',
  'than normal transaction data, and fees on rollups drop.',
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

/** a small voice waveform, alive while reading */
function wave(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, amp: number, color = C.ok) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 0; i < 9; i++) {
    const h = 4 + amp * (8 + 14 * Math.abs(Math.sin(t * 7 + i * 0.9) * Math.cos(t * 3.1 + i * 0.4)))
    ctx.beginPath()
    ctx.moveTo(x + i * 9, y - h / 2)
    ctx.lineTo(x + i * 9, y + h / 2)
    ctx.stroke()
  }
  ctx.restore()
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.4, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, OK_RGB, 0.07)
  icon(ctx, SPEAKER, 960, 410, 130 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Private Read Aloud', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Listen to answers. The voice runs on your device.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

/** the browser's voices: on-device offered, cloud hidden */
function voices(ctx: CanvasRenderingContext2D, t: number) {
  const K = READ_CUES
  const a = win(t, K.voices[0], K.voices[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'THE VOICES YOUR BROWSER OFFERS', 960, 170, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Some of them read in the cloud.', 960, 240, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  // on device
  panel(ctx, 160, 310, 780, 470, 18, `rgba(${OK_RGB},0.03)`, `rgba(${OK_RGB},0.3)`)
  text(ctx, 'ON THIS DEVICE · NULL USES THESE', 200, 360, { size: 16, family: MONO, color: C.ok, spacing: '0.14em' })
  LOCAL.forEach((v, i) => {
    const va = easeOut(prog(t, K.local[i], K.local[i] + 0.3))
    if (!va) return
    ctx.save()
    ctx.globalAlpha *= va
    panel(ctx, 200, 400 + i * 110, 700, 84, 12, C.panel, C.line2)
    check(ctx, 236, 442 + i * 110, 16, C.ok, 2.6)
    text(ctx, v, 266, 450 + i * 110, { size: 26, color: C.fg })
    ctx.restore()
  })
  // cloud
  panel(ctx, 980, 310, 780, 470, 18, `rgba(${BAD_RGB},0.03)`, `rgba(${BAD_RGB},0.3)`)
  text(ctx, 'IN THE CLOUD · SENDS THE TEXT AWAY', 1020, 360, { size: 16, family: MONO, color: C.bad, spacing: '0.14em' })
  const hidden = easeOut(prog(t, K.hide, K.hide + 0.5))
  CLOUD.forEach((v, i) => {
    const va = easeOut(prog(t, K.cloud[i], K.cloud[i] + 0.3))
    if (!va) return
    ctx.save()
    ctx.globalAlpha *= va * (1 - 0.55 * hidden)
    panel(ctx, 1020, 400 + i * 110, 700, 84, 12, C.panel, C.line2)
    icon(ctx, CLOUD_OFF, 1060, 442 + i * 110, 24, C.bad, 2)
    const w = text(ctx, v, 1090, 450 + i * 110, { size: 26, color: C.fg })
    if (hidden > 0) {
      ctx.fillStyle = C.bad
      ctx.fillRect(1090, 441 + i * 110, w * hidden, 3)
    }
    ctx.restore()
  })
  text(ctx, 'hidden by NULL', 1020, 650, { size: 22, family: MONO, color: C.bad, alpha: hidden })
  text(ctx, 'They turn your answer into sound on a server.', 1020, 690, { size: 20, color: C.muted, alpha: hidden })
  ctx.restore()
}

function chat(ctx: CanvasRenderingContext2D, t: number) {
  const K = READ_CUES
  const a = win(t, K.chat[0], K.chat[1], 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 120
  const Y = 90 + (1 - easeOut(prog(t, K.chat[0], K.chat[0] + 0.8))) * 30
  const W = 1680
  panel(ctx, X, Y, W, 900, 22, C.panel, C.line2)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X, Y + 80)
  ctx.lineTo(X + W, Y + 80)
  ctx.stroke()
  nullMark(ctx, X + 44, Y + 40, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 47, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 47, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  const CX = X + 260
  const CW = 1160
  // question
  const qw = measure(ctx, Q, { size: 20 }) + 44
  ctx.beginPath()
  ctx.roundRect(CX + CW - qw, Y + 130, qw, 50, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
  ctx.strokeStyle = C.line2
  ctx.stroke()
  text(ctx, Q, CX + CW - qw + 22, Y + 162, { size: 20, color: C.fg })
  // answer, the sentence being read is lit
  panel(ctx, CX, Y + 230, 40, 40, 8, C.panel, C.line2)
  nullMark(ctx, CX + 20, Y + 250, 8, 1, 1, 2.5)
  const p = prog(t, K.reading[0], K.reading[1])
  const reading = t >= K.reading[0] && t < K.reading[1]
  const total = ANSWER.reduce((n, l) => n + l.length, 0)
  let done = 0
  ANSWER.forEach((l, i) => {
    const from = done / total
    const to = (done + l.length) / total
    done += l.length
    const lit = reading && p >= from && p < to
    if (lit) {
      ctx.fillStyle = `rgba(${OK_RGB},0.08)`
      ctx.beginPath()
      ctx.roundRect(CX + 60, Y + 236 + i * 48, 900, 42, 6)
      ctx.fill()
    }
    text(ctx, l, CX + 70, Y + 266 + i * 48, { size: 25, color: lit ? C.fg : reading && p >= to ? C.muted : C.soft })
  })
  const MY = Y + 266 + ANSWER.length * 48 + 10
  if (reading || t >= K.reading[1]) {
    const ra = reading ? 1 : 1 - easeOut(prog(t, K.reading[1], K.reading[1] + 0.5))
    if (ra > 0) {
      ctx.save()
      ctx.globalAlpha *= ra
      wave(ctx, CX + 70, MY + 22, t, reading ? 1 : 0)
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath()
      ctx.roundRect(CX + 160, MY + 19, 420, 6, 3)
      ctx.fill()
      ctx.fillStyle = C.ok
      ctx.beginPath()
      ctx.roundRect(CX + 160, MY + 19, 420 * p, 6, 3)
      ctx.fill()
      text(ctx, 'reading on this device · Microsoft Zira', CX + 600, MY + 28, { size: 16, family: MONO, color: C.ok })
      ctx.restore()
    }
  }
  // meta line with listen / stop
  const my = MY + 80
  const on = reading
  const metaPre = 'Claude Sonnet 5.5 · 2.4s · paid by proof ✓ · '
  const mx = CX + 70 + text(ctx, metaPre, CX + 70, my, { size: 16, family: MONO, color: C.dim })
  icon(ctx, SPEAKER, mx + 9, my - 6, 16, on ? C.ok : C.fg, 2)
  const lw = text(ctx, on ? 'stop' : 'listen', mx + 24, my, { size: 16, family: MONO, color: on ? C.ok : C.fg })
  text(ctx, ' · what was sent · share', mx + 24 + lw, my, { size: 16, family: MONO, color: C.dim })
  // composer, with the mic for Private Voice
  panel(ctx, CX, Y + 790, CW, 70, 14, C.panel2, C.line3)
  text(ctx, 'Ask privately…', CX + 24, Y + 833, { size: 20, color: C.dim })
  ctx.save()
  ctx.strokeStyle = C.soft
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.roundRect(CX + CW - 108, Y + 808, 14, 22, 7)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(CX + CW - 101, Y + 822, 12, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.moveTo(CX + CW - 101, Y + 834)
  ctx.lineTo(CX + CW - 101, Y + 842)
  ctx.stroke()
  ctx.restore()
  ctx.beginPath()
  ctx.roundRect(CX + CW - 60, Y + 804, 42, 42, 9)
  ctx.fillStyle = C.fg
  ctx.fill()
  const at = { x: mx + 40, y: my - 6 }
  const e = easeInOut(prog(t, K.listen - 1.0, K.listen - 0.1))
  pointer(ctx, 1200 + (at.x - 1200) * e, 820 + (at.y - 820) * e, win(t, K.listen - 1.1, K.listen + 0.5, 0.2, 0.3))
  const r = prog(t, K.listen, K.listen + 0.45)
  if (r > 0 && r < 1) {
    ctx.beginPath()
    ctx.arc(at.x, at.y, 8 + r * 26, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${OK_RGB},${0.6 * (1 - r)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()
}

const STEPS = [
  { k: 'YOU TALK', v: 'Whisper writes it down in your browser', where: 'device' },
  { k: 'ONLY TEXT GOES OUT', v: 'names as placeholders', where: 'out' },
  { k: 'THE AI ANSWERS', v: 'paid by proof, no account', where: 'out' },
  { k: 'NAMES FILLED BACK IN', v: 'in your browser', where: 'device' },
  { k: 'YOU LISTEN', v: 'a voice on your device reads it', where: 'device' },
]

/** the voice loop: sound never leaves the device */
function loop(ctx: CanvasRenderingContext2D, t: number) {
  const K = READ_CUES
  const a = win(t, K.loop[0], K.loop[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'A VOICE CONVERSATION', 960, 270, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Your voice never leaves your device.', 960, 338, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  STEPS.forEach((s, i) => {
    const sa = easeOut(prog(t, K.steps[i] - 0.2, K.steps[i] + 0.2))
    if (!sa) return
    const x = 110 + i * 345
    const device = s.where === 'device'
    ctx.save()
    ctx.globalAlpha *= sa
    panel(ctx, x, 450 - (1 - sa) * 12, 320, 230, 16, device ? `rgba(${OK_RGB},0.04)` : C.panel, device ? `rgba(${OK_RGB},0.35)` : C.line2)
    text(ctx, `${i + 1}`, x + 28, 500, { size: 18, family: MONO, color: device ? C.ok : C.dim })
    text(ctx, s.k, x + 28, 550, { size: 17, family: MONO, color: device ? C.ok : C.soft, spacing: '0.08em' })
    const words = s.v.split(' ')
    let line = ''
    let ly = 600
    for (const w of words) {
      if ((line + ' ' + w).length > 22) {
        text(ctx, line, x + 28, ly, { size: 22, color: C.fg })
        line = w
        ly += 32
      } else line = line ? `${line} ${w}` : w
    }
    text(ctx, line, x + 28, ly, { size: 22, color: C.fg })
    if (i < STEPS.length - 1) text(ctx, '›', x + 333, 570, { size: 34, color: C.muted, align: 'center' })
    ctx.restore()
  })
  ctx.save()
  ctx.globalAlpha *= easeOut(prog(t, K.steps[4] + 0.4, K.steps[4] + 0.8))
  ctx.fillStyle = `rgba(${OK_RGB},0.7)`
  ctx.fillRect(110, 730, 14, 14)
  text(ctx, 'on your device', 136, 743, { size: 18, family: MONO, color: C.ok })
  ctx.fillStyle = C.line3
  ctx.fillRect(330, 730, 14, 14)
  text(ctx, 'sent, as text only', 356, 743, { size: 18, family: MONO, color: C.muted })
  ctx.restore()
  ctx.restore()
}

const POINTS = [
  { k: 'ON-DEVICE VOICES', v: 'the only ones NULL uses' },
  { k: 'CLOUD VOICES HIDDEN', v: 'they send text to a server' },
  { k: 'AUTO-READ', v: 'hands-free with Private Voice' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const K = READ_CUES
  const a = win(t, 22.4, K.end, 0.4, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, K.points[i] - 0.3, K.points[i] + 0.1))
    if (!pa) return
    const x = 120 + i * 570
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, 420 - (1 - pa) * 14, 540, 220, 18, C.panel, `rgba(${OK_RGB},0.3)`)
    text(ctx, p.k, x + 36, 486, { size: 16, family: MONO, color: C.ok, spacing: '0.16em' })
    text(ctx, p.v, x + 36, 566, { size: 30, color: C.fg })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = READ_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  icon(ctx, SPEAKER, 960, 320, 110, C.fg, 2)
  wave(ctx, 1030, 320, t, 0.6)
  text(ctx, 'Listen privately.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private Read Aloud, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawReadAloud(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  voices(ctx, t)
  chat(ctx, t)
  loop(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

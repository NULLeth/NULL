// "Private Voice": ~28 s promo. Title → voice typing usually uploads your audio → the mic in
// NULL Chat: record, Whisper turns it into text in the browser, the shield catches the name →
// what leaves the device → how it runs → end card. The sentence, the note under the composer
// and the shield hit are what NULL Chat really produced for this recording.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const VOICE_DURATION = 28

export const VOICE_CUES = {
  cloud: [3.4, 6.6],
  click: 7.6,
  speakEnd: 13.6,
  stop: 14.0,
  whisper: [14.2, 15.6],
  typed: [15.6, 16.2],
  note: 16.3,
  shield: 16.7,
  leaves: [17.4, 18.0],
  hops: [19.8, 20.6, 21.4, 22.2],
  end: 23.6,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const BAD_RGB = '239,107,107'
const SAID = 'Write a short email to my landlord Jonas Weber. Tell him I am moving out at the end of next month.'
const NOTE = '7.0 s of speech turned into text on your device in 1.6 s · your voice was not sent anywhere'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Private Voice', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Talk to AI. Your voice never leaves your device.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

const MIC = new Path2D('M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3')
const CLOUD = new Path2D('M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z')

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

function shieldIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(cx, cy - s)
  ctx.lineTo(cx + s * 0.85, cy - s * 0.6)
  ctx.lineTo(cx + s * 0.75, cy + s * 0.25)
  ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.8, cx, cy + s)
  ctx.quadraticCurveTo(cx - s * 0.5, cy + s * 0.8, cx - s * 0.75, cy + s * 0.25)
  ctx.lineTo(cx - s * 0.85, cy - s * 0.6)
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
  check(ctx, cx, cy, s * 0.7, color, 1.8)
}

function tagPill(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, alpha = 1): number {
  const w = measure(ctx, s, { size, family: MONO })
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  ctx.roundRect(x - 3, y - size * 0.95, w + 6, size * 1.3, 5)
  ctx.fillStyle = `rgba(${ETH_RGB},0.12)`
  ctx.fill()
  text(ctx, s, x, y, { size, family: MONO, color: C.eth })
  ctx.restore()
  return w
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

/** loudness of the "speech" at time t: syllables with pauses between words */
function loud(t: number): number {
  const k = Math.floor(t * 9)
  const r = Math.sin(k * 12.9898) * 43758.5453
  const syl = r - Math.floor(r)
  const word = 0.55 + 0.45 * Math.sin(t * 2.3) * Math.sin(t * 0.7 + 1)
  return clamp(0.15 + syl * 0.85 * word)
}

/** voice typing elsewhere: the audio goes up to a cloud */
function cloudScene(ctx: CanvasRenderingContext2D, t: number) {
  const K = VOICE_CUES
  const a = win(t, K.cloud[0], K.cloud[1], 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'YOUR VOICE IS BIOMETRIC', 960, 250, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Voice typing in browsers usually uploads it.', 960, 318, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  // mic
  panel(ctx, 470, 470, 200, 200, 24, C.panel, C.line2)
  icon(ctx, MIC, 570, 560, 84, C.fg, 2.4)
  text(ctx, 'your voice', 570, 712, { size: 18, family: MONO, color: C.dim, align: 'center' })
  // cloud
  panel(ctx, 1250, 470, 200, 200, 24, C.panel, `rgba(${BAD_RGB},0.35)`)
  icon(ctx, CLOUD, 1350, 570, 96, C.bad, 2.2)
  text(ctx, 'a speech cloud', 1350, 712, { size: 18, family: MONO, color: C.bad, align: 'center' })
  // the audio flying over: a waveform ribbon
  const flow = prog(t, K.cloud[0] + 0.6, K.cloud[1] - 0.4)
  const x0 = 690
  const x1 = 1230
  ctx.lineWidth = 3
  for (let i = 0; i < 60; i++) {
    const u = i / 59
    const x = x0 + (x1 - x0) * u
    if (u > flow) break
    const h = 10 + 46 * loud(u * 4 + t * 0.6) * Math.sin(Math.PI * u)
    ctx.strokeStyle = `rgba(${BAD_RGB},${0.25 + 0.6 * u})`
    ctx.beginPath()
    ctx.moveTo(x, 570 - h)
    ctx.lineTo(x, 570 + h)
    ctx.stroke()
  }
  const na = easeOut(prog(t, K.cloud[0] + 1.6, K.cloud[0] + 2.1))
  text(ctx, 'the audio leaves your device before any text exists', 960, 820, { size: 22, family: MONO, color: C.muted, align: 'center', alpha: na })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = VOICE_CUES
  const a = win(t, 6.4, 19.0, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 6.4, 7.2))) * 30
  const X = 120
  const Y = 90 + rise
  const W = 1680
  const H = 900
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
  text(ctx, 'Your chats stay in this browser.', X + 170, Y + 186, { size: 16, color: C.dim, align: 'center' })
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 130, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  text(ctx, '0.049918', X + 28, Y + H - 80, { size: 36, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + H - 80, { size: 16, family: MONO, color: C.muted })

  // top bar
  const M = X + 340
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(M, Y + 76)
  ctx.lineTo(X + W, Y + 76)
  ctx.stroke()
  panel(ctx, M + 28, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, 'Claude Sonnet 5.5  ⌄', M + 46, Y + 46, { size: 16, family: MONO, color: C.fg })
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  const CX = M + 120
  const CW = 1060
  const mid = CX + CW / 2
  const BY = Y + H - 150
  const recording = t >= K.click && t < K.stop
  const working = t >= K.stop && t < K.whisper[1]

  // empty chat
  const ea = 1 - prog(t, K.click + 0.2, K.click + 0.6)
  if (ea > 0) {
    ctx.save()
    ctx.globalAlpha *= ea
    nullMark(ctx, mid, Y + 250, 26, 1, 1, 5)
    text(ctx, 'Ask privately.', mid, Y + 340, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    text(ctx, 'Talk instead of typing: Whisper turns speech into text in your browser', mid, Y + 394, { size: 18, family: MONO, color: C.dim, align: 'center' })
    ctx.restore()
  }

  // while recording: what you say, as live captions over a big waveform
  const ra = win(t, K.click + 0.55, K.whisper[0] + 0.2, 0.4, 0.3)
  if (ra > 0) {
    ctx.save()
    ctx.globalAlpha *= ra
    const PY = Y + 140
    text(ctx, 'YOU SAY', mid, PY, { size: 14, family: MONO, color: C.dim, align: 'center', spacing: '0.18em' })
    const n = Math.floor(prog(t, K.click + 0.7, K.speakEnd) * SAID.length)
    const said = SAID.slice(0, n)
    const words = said.split(' ')
    const lines: string[] = ['']
    for (const w of words) {
      const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w
      if (measure(ctx, next, { size: 34 }) > CW - 120) lines.push(w)
      else lines[lines.length - 1] = next
    }
    lines.forEach((l, i) => text(ctx, `${i === 0 ? '“' : ''}${l}${i === lines.length - 1 && n >= SAID.length ? '”' : ''}`, mid, PY + 64 + i * 50, { size: 34, color: C.soft, align: 'center' }))
    // waveform
    const wy = PY + 290
    const bars = 72
    for (let i = 0; i < bars; i++) {
      const u = i / (bars - 1)
      const live = recording && t < K.speakEnd
      const h = live ? 6 + 70 * loud(t * 1.7 - u * 2.2) * (0.35 + 0.65 * Math.sin(Math.PI * u)) : 4
      ctx.fillStyle = `rgba(${BAD_RGB},${live ? 0.75 : 0.3})`
      ctx.beginPath()
      ctx.roundRect(CX + 60 + u * (CW - 120) - 3, wy - h, 6, h * 2, 3)
      ctx.fill()
    }
    ctx.restore()
  }

  // Whisper at work, in the browser
  const wa = win(t, K.whisper[0], K.leaves[0], 0.3, 0.35)
  if (wa > 0) {
    ctx.save()
    ctx.globalAlpha *= wa
    const PY = Y + 130
    panel(ctx, CX, PY, CW, 380, 16, 'rgba(255,255,255,0.02)', `rgba(${OK_RGB},0.3)`)
    text(ctx, 'WHISPER · RUNNING IN YOUR BROWSER', CX + 30, PY + 46, { size: 14, family: MONO, color: C.ok, spacing: '0.16em' })
    // a log-mel spectrogram filling in
    const cols = 120
    const rows = 26
    const fill = prog(t, K.whisper[0], K.whisper[0] + 0.7)
    const cw = (CW - 60) / cols
    const ch = 150 / rows
    for (let c = 0; c < cols * fill; c++)
      for (let r = 0; r < rows; r++) {
        const e = loud(c * 0.11) * Math.exp(-r / (8 + 10 * loud(c * 0.07 + 3)))
        ctx.fillStyle = `rgba(${OK_RGB},${0.05 + 0.75 * e})`
        ctx.fillRect(CX + 30 + c * cw, PY + 230 - r * ch, cw - 1, ch - 1)
      }
    text(ctx, 'log-mel features', CX + 30, PY + 260, { size: 13, family: MONO, color: C.dim })
    const steps = ['encoder', 'decoder', 'text']
    steps.forEach((s, i) => {
      const at = K.whisper[0] + 0.6 + i * 0.25
      const on = t >= at
      const x = CX + 30 + i * 200
      panel(ctx, x, PY + 290, 170, 52, 10, C.panel, on ? `rgba(${OK_RGB},0.45)` : C.line2)
      text(ctx, s, x + 85, PY + 322, { size: 16, family: MONO, color: on ? C.ok : C.dim, align: 'center' })
      if (i < steps.length - 1) text(ctx, '→', x + 185, PY + 323, { size: 18, color: C.dim, align: 'center' })
    })
    text(ctx, 'whisper-tiny · 41 MB · on your CPU', CX + CW - 30, PY + 322, { size: 15, family: MONO, color: C.muted, align: 'right' })
    ctx.restore()
  }

  // what leaves the device
  const la = t >= K.leaves[0] ? easeOut(prog(t, K.leaves[0], K.leaves[0] + 0.5)) : 0
  if (la > 0) {
    ctx.save()
    ctx.globalAlpha *= la
    const PY = Y + 130
    panel(ctx, CX, PY, CW, 380, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, 'WHAT LEAVES YOUR DEVICE', CX + 30, PY + 46, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    icon(ctx, MIC, CX + 50, PY + 112, 30, C.soft)
    text(ctx, 'your voice', CX + 84, PY + 121, { size: 26, color: C.fg })
    text(ctx, 'stays here, then it’s gone', CX + 330, PY + 121, { size: 22, family: MONO, color: C.ok })
    check(ctx, CX + CW - 50, PY + 113, 16, C.ok, 2.6)
    ctx.strokeStyle = C.line
    ctx.beginPath()
    ctx.moveTo(CX + 30, PY + 158)
    ctx.lineTo(CX + CW - 30, PY + 158)
    ctx.stroke()
    const sa = easeOut(prog(t, K.leaves[1], K.leaves[1] + 0.4))
    ctx.save()
    ctx.globalAlpha *= sa
    text(ctx, 'T', CX + 50, PY + 214, { size: 28, weight: 600, color: C.soft, align: 'center' })
    text(ctx, 'the text, shielded', CX + 84, PY + 214, { size: 26, color: C.fg })
    let x = CX + 84
    x += text(ctx, 'Write a short email to my landlord ', x, PY + 264, { size: 21, color: C.soft })
    x += tagPill(ctx, '[NAME_1]', x, PY + 264, 19) + 4
    text(ctx, '. Tell him I am moving…', x, PY + 264, { size: 21, color: C.soft })
    text(ctx, 'sent to the model you pick, paid with a zero-knowledge proof', CX + 84, PY + 312, { size: 16, family: MONO, color: C.muted })
    ctx.restore()
    ctx.restore()
  }

  // note + shield bar over the composer
  const na = easeOut(prog(t, K.note, K.note + 0.35))
  if (na > 0) {
    ctx.save()
    ctx.globalAlpha *= na
    icon(ctx, MIC, CX + 8, BY - 72, 15, C.ok, 2)
    text(ctx, NOTE, CX + 24, BY - 66, { size: 13.5, family: MONO, color: C.ok })
    ctx.restore()
  }
  const sh = easeOut(prog(t, K.shield, K.shield + 0.3))
  if (sh > 0) {
    ctx.save()
    ctx.globalAlpha *= sh
    const y = BY - 28
    let x = CX
    shieldIcon(ctx, x + 8, y - 5, 8, C.ok)
    x += 22
    x += text(ctx, 'SHIELD', x, y, { size: 14, family: MONO, color: C.ok, spacing: '0.12em' }) + 14
    x += text(ctx, '1 of 1 hidden from the AI', x, y, { size: 14, family: MONO, color: C.dim }) + 14
    const label = 'name · Jonas Weber'
    const w = measure(ctx, label, { size: 13, family: MONO }) + 20
    ctx.beginPath()
    ctx.roundRect(x, y - 18, w, 26, 6)
    ctx.fillStyle = `rgba(${OK_RGB},0.07)`
    ctx.fill()
    ctx.strokeStyle = `rgba(${OK_RGB},0.35)`
    ctx.lineWidth = 1.2
    ctx.stroke()
    text(ctx, label, x + 10, y, { size: 13, family: MONO, color: C.ok })
    ctx.restore()
  }

  // composer
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const btn = (bx: number, w: number, label: string, on: boolean, shield = false) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = on ? `rgba(${OK_RGB},0.08)` : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = on ? `rgba(${OK_RGB},0.4)` : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (shield) shieldIcon(ctx, bx + 22, BY + 48, 8, C.ok)
    text(ctx, label, shield ? bx + 38 : bx + w / 2, BY + 54, { size: 14, family: MONO, color: on ? C.ok : C.dim, align: shield ? 'left' : 'center', spacing: '0.08em' })
  }
  btn(CX + 12, 74, 'WEB', false)
  btn(CX + 94, 92, 'IMAGE', false)
  btn(CX + 194, 112, 'SHIELD', true, true)
  const TX = CX + 330
  // the mic button: idle → recording (red, clock) → working (spinner) → idle
  const MBX = CX + CW - 54 - 12 - (recording ? 96 : 50)
  const mw = recording ? 96 : 50
  ctx.beginPath()
  ctx.roundRect(MBX, BY + 26, mw, 44, 10)
  ctx.fillStyle = recording ? `rgba(${BAD_RGB},0.1)` : 'rgba(0,0,0,0)'
  ctx.fill()
  ctx.strokeStyle = recording ? `rgba(${BAD_RGB},0.5)` : working ? `rgba(${OK_RGB},0.4)` : C.line2
  ctx.lineWidth = 1.5
  ctx.stroke()
  if (recording) {
    const lv = t < K.speakEnd ? loud(t * 1.7) : 0
    ctx.fillStyle = `rgba(${BAD_RGB},0.3)`
    ctx.beginPath()
    ctx.arc(MBX + 24, BY + 48, 8 * (1 + lv), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = C.bad
    ctx.fillRect(MBX + 19, BY + 43, 10, 10)
    const secs = Math.floor(t - K.click)
    text(ctx, `0:${String(secs).padStart(2, '0')}`, MBX + 40, BY + 54, { size: 15, family: MONO, color: C.bad })
  } else if (working) spinner(ctx, MBX + 25, BY + 48, 9, t, C.ok)
  else icon(ctx, MIC, MBX + 25, BY + 48, 20, C.dim, 2)
  // text in the composer: placeholder, then the transcript
  const n = Math.floor(prog(t, K.typed[0], K.typed[1]) * SAID.length)
  if (n <= 0) text(ctx, recording ? 'Listening…' : working ? 'Turning speech into text…' : 'Ask privately…', TX, BY + 56, { size: 21, color: recording ? C.bad : C.dim })
  else {
    const shown = SAID.slice(0, n)
    const cut = shown.length > 52 ? shown.lastIndexOf(' ', 52) : -1
    const l1 = cut > 0 ? shown.slice(0, cut) : shown
    const l2 = cut > 0 ? shown.slice(cut + 1) : ''
    const nameAt = SAID.indexOf('Jonas Weber')
    text(ctx, l1, TX, BY + 40, { size: 19, color: C.fg })
    if (t >= K.shield && nameAt < l1.length) {
      const pre = measure(ctx, l1.slice(0, nameAt), { size: 19 })
      const nw = measure(ctx, 'Jonas Weber', { size: 19 })
      ctx.fillStyle = `rgba(${OK_RGB},0.85)`
      ctx.fillRect(TX + pre, BY + 45, nw * easeOut(prog(t, K.shield, K.shield + 0.25)), 2)
    }
    if (l2) text(ctx, l2, TX, BY + 72, { size: 19, color: C.fg })
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 26, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 57, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'payment identity hidden · personal details shielded, the model reads the rest', CX + CW / 2, Y + H - 24, { size: 13, family: MONO, color: C.ok, align: 'center' })

  // the pointer clicks the mic, then clicks it again to stop
  const target = { x: CX + CW - 54 - 12 - 50 + 22, y: BY + 44 }
  const m1 = easeInOut(prog(t, K.click - 0.8, K.click - 0.1))
  const p0 = { x: CX + 600, y: BY - 160 }
  const pa = win(t, K.click - 0.9, K.click + 0.7, 0.2, 0.3) + win(t, K.stop - 0.6, K.stop + 0.6, 0.2, 0.3)
  const stopX = CX + CW - 54 - 12 - 96 + 22
  const px = t < K.click + 1 ? p0.x + (target.x - p0.x) * m1 : stopX
  const py = t < K.click + 1 ? p0.y + (target.y - p0.y) * m1 : target.y + (1 - easeOut(prog(t, K.stop - 0.6, K.stop - 0.1))) * 60
  pointer(ctx, px, py, Math.min(1, pa))
  for (const at of [K.click, K.stop]) {
    const r = prog(t, at, at + 0.5)
    if (r > 0 && r < 1) {
      ctx.beginPath()
      ctx.arc(at === K.click ? target.x : stopX, target.y, 8 + r * 26, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${at === K.click ? BAD_RGB : OK_RGB},${0.6 * (1 - r)})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  ctx.restore()
}

const HOPS = [
  { k: 'MICROPHONE', v: 'your voice' },
  { k: 'WHISPER', v: 'speech → text' },
  { k: 'PROMPT SHIELD', v: 'names → [NAME_1]' },
  { k: 'THE MODEL', v: 'text only' },
]

function howItRuns(ctx: CanvasRenderingContext2D, t: number) {
  const K = VOICE_CUES
  const a = win(t, 18.8, K.end, 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HOW IT RUNS', 960, 220, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Your voice turns into text before anything is sent.', 960, 288, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })
  // the browser box around the first three steps
  ctx.save()
  ctx.setLineDash([8, 8])
  panel(ctx, 110, 380, 1290, 300, 22, 'rgba(255,255,255,0.012)', `rgba(${OK_RGB},0.4)`)
  ctx.restore()
  text(ctx, 'YOUR BROWSER', 140, 424, { size: 15, family: MONO, color: C.ok, spacing: '0.16em' })
  HOPS.forEach((h, i) => {
    const x = i < 3 ? 150 + i * 420 : 1500
    const lit = easeOut(prog(t, K.hops[i], K.hops[i] + 0.3))
    panel(ctx, x, 460, 320, 180, 16, C.panel, lit ? `rgba(${i === 3 ? ETH_RGB : OK_RGB},${0.2 + 0.4 * lit})` : C.line2)
    text(ctx, h.k, x + 26, 504, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, h.v, x + 26, 576, { size: 30, weight: 600, spacing: '-1px', color: lit ? C.fg : C.muted })
    if (i < 3) {
      const ax0 = x + 324
      const ax1 = i < 2 ? x + 416 : 1496
      ctx.strokeStyle = C.line3
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(ax0, 550)
      ctx.lineTo(ax1, 550)
      ctx.moveTo(ax1 - 8, 544)
      ctx.lineTo(ax1, 550)
      ctx.lineTo(ax1 - 8, 556)
      ctx.stroke()
      const p = prog(t, K.hops[i] + 0.1, K.hops[i + 1])
      if (p > 0 && p < 1) {
        const px = ax0 + (ax1 - ax0) * easeInOut(p)
        const g = ctx.createRadialGradient(px, 550, 0, px, 550, 20)
        g.addColorStop(0, `rgba(${i === 2 ? ETH_RGB : OK_RGB},0.9)`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(px - 20, 530, 40, 40)
      }
    }
  })
  const fa = easeOut(prog(t, K.hops[3] + 0.3, K.hops[3] + 0.8))
  text(ctx, '41 MB, downloads once · runs on your CPU · many languages, English works best', 960, 780, { size: 20, family: MONO, color: C.muted, align: 'center', alpha: fa })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = VOICE_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Talk privately.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private Voice, live in NULL Chat. Tap the mic.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawVoice(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  cloudScene(ctx, t)
  app(ctx, t)
  howItRuns(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

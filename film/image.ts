// "Private image generation": ~28 s promo. Title → NULL Chat in image mode: a prompt,
// the picture develops, a one-line edit turns night into sunrise → three points → end
// card. The pictures are drawn here (a glass lighthouse), not generated.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, seeded, spinner, text, win } from './kit'

export const IMAGE_DURATION = 28

export const IMAGE_CUES = {
  toggle: 4.0,
  aspect: 4.5,
  typeStart: 4.9,
  typeEnd: 6.9,
  send: 7.1,
  steps: [7.7, 8.3, 9.9],
  reveal: [9.9, 11.0],
  editTypeStart: 11.9,
  editTypeEnd: 12.8,
  editSend: 13.0,
  editDone: 14.6,
  reveal2: [14.6, 15.6],
  points: [18.4, 19.3, 20.2],
  end: 22.2,
}

const ETH_RGB = '138,152,255'
const PROMPT = 'A glass lighthouse on a cliff at night, cinematic'
const EDIT = 'make it sunrise'
const IW = 1344
const IH = 768

// ─── the picture ─────────────────────────────────────────────────────────────

type Mood = 'night' | 'sunrise'
const cache: Partial<Record<Mood, HTMLCanvasElement>> = {}

function lighthouse(mood: Mood): HTMLCanvasElement {
  const hit = cache[mood]
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = IW
  cv.height = IH
  const g = cv.getContext('2d')!
  const night = mood === 'night'
  const horizon = IH * 0.62

  // sky
  const sky = g.createLinearGradient(0, 0, 0, horizon)
  if (night) {
    sky.addColorStop(0, '#04061a')
    sky.addColorStop(0.6, '#141a4a')
    sky.addColorStop(1, '#3a2d6b')
  } else {
    sky.addColorStop(0, '#5f8fd0')
    sky.addColorStop(0.55, '#f2a7a0')
    sky.addColorStop(1, '#ffcf8a')
  }
  g.fillStyle = sky
  g.fillRect(0, 0, IW, horizon)

  const rnd = seeded(7)
  if (night) {
    for (let i = 0; i < 260; i++) {
      const x = rnd() * IW
      const y = rnd() * horizon * 0.9
      const r = rnd() * 1.6 + 0.3
      g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.7})`
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
  }
  // moon or sun
  const bx = night ? IW * 0.22 : IW * 0.3
  const by = night ? IH * 0.2 : horizon - 6
  const halo = g.createRadialGradient(bx, by, 0, bx, by, night ? 220 : 380)
  halo.addColorStop(0, night ? 'rgba(220,225,255,0.55)' : 'rgba(255,240,200,0.95)')
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = halo
  g.fillRect(0, 0, IW, IH)
  g.fillStyle = night ? '#e9ecff' : '#fff4d6'
  g.beginPath()
  g.arc(bx, by, night ? 38 : 64, 0, Math.PI * 2)
  g.fill()

  // sea
  const sea = g.createLinearGradient(0, horizon, 0, IH)
  if (night) {
    sea.addColorStop(0, '#1a1f4d')
    sea.addColorStop(1, '#03040d')
  } else {
    sea.addColorStop(0, '#f0b98d')
    sea.addColorStop(1, '#2c4a7a')
  }
  g.fillStyle = sea
  g.fillRect(0, horizon, IW, IH - horizon)
  // glints
  for (let i = 0; i < 140; i++) {
    const y = horizon + 4 + Math.pow(rnd(), 1.6) * (IH - horizon)
    const spread = 40 + (y - horizon) * 0.9
    const x = bx + (rnd() - 0.5) * spread * 2
    const w = 8 + rnd() * 40
    g.fillStyle = night ? `rgba(200,210,255,${0.12 + rnd() * 0.3})` : `rgba(255,236,190,${0.2 + rnd() * 0.45})`
    g.fillRect(x, y, w, 1.6)
  }

  // cliff
  g.fillStyle = night ? '#05060c' : '#2a1c1e'
  g.beginPath()
  g.moveTo(IW * 0.52, IH)
  g.lineTo(IW * 0.58, horizon + 30)
  g.lineTo(IW * 0.66, horizon - 40)
  g.lineTo(IW * 0.74, horizon - 70)
  g.lineTo(IW * 0.86, horizon - 62)
  g.lineTo(IW * 0.95, horizon - 20)
  g.lineTo(IW, horizon + 10)
  g.lineTo(IW, IH)
  g.closePath()
  g.fill()

  // glass lighthouse
  const lx = IW * 0.79
  const base = horizon - 64
  const top = base - 330
  const bw = 62
  const tw = 40
  const body = g.createLinearGradient(lx - bw, 0, lx + bw, 0)
  body.addColorStop(0, night ? 'rgba(160,180,255,0.18)' : 'rgba(255,220,190,0.25)')
  body.addColorStop(0.45, night ? 'rgba(220,230,255,0.42)' : 'rgba(255,248,235,0.6)')
  body.addColorStop(1, night ? 'rgba(120,140,230,0.12)' : 'rgba(255,190,150,0.2)')
  g.fillStyle = body
  g.beginPath()
  g.moveTo(lx - bw, base)
  g.lineTo(lx - tw, top)
  g.lineTo(lx + tw, top)
  g.lineTo(lx + bw, base)
  g.closePath()
  g.fill()
  g.strokeStyle = night ? 'rgba(210,220,255,0.7)' : 'rgba(255,245,230,0.85)'
  g.lineWidth = 2.5
  g.stroke()
  // facets
  g.lineWidth = 1.2
  for (let i = 1; i < 6; i++) {
    const y = base - ((base - top) * i) / 6
    const half = bw - ((bw - tw) * i) / 6
    g.beginPath()
    g.moveTo(lx - half, y)
    g.lineTo(lx + half, y)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(lx, base)
  g.lineTo(lx, top)
  g.stroke()
  // lantern room
  g.fillStyle = night ? '#fff6c8' : 'rgba(255,250,235,0.7)'
  g.fillRect(lx - 30, top - 52, 60, 52)
  g.fillStyle = night ? '#0b0d1a' : '#3a2a2a'
  g.beginPath()
  g.moveTo(lx - 40, top - 52)
  g.lineTo(lx, top - 92)
  g.lineTo(lx + 40, top - 52)
  g.closePath()
  g.fill()
  // light
  const lamp = g.createRadialGradient(lx, top - 26, 0, lx, top - 26, night ? 260 : 120)
  lamp.addColorStop(0, night ? 'rgba(255,240,170,0.9)' : 'rgba(255,240,200,0.5)')
  lamp.addColorStop(1, 'rgba(255,240,170,0)')
  g.fillStyle = lamp
  g.fillRect(0, 0, IW, IH)
  if (night) {
    const beam = g.createLinearGradient(lx, top - 26, IW * 0.18, top - 140)
    beam.addColorStop(0, 'rgba(255,240,180,0.55)')
    beam.addColorStop(1, 'rgba(255,240,180,0)')
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(lx, top - 26)
    g.lineTo(IW * 0.05, top - 230)
    g.lineTo(IW * 0.05, top + 70)
    g.closePath()
    g.fill()
  }
  cache[mood] = cv
  return cv
}

/** The picture developing: blur and brightness settle as p goes 0 → 1. */
function picture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mood: Mood, p: number) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 16)
  ctx.clip()
  ctx.fillStyle = C.panel2
  ctx.fillRect(x, y, w, h)
  if (p > 0) {
    const e = easeOut(p)
    ctx.globalAlpha *= Math.min(1, p * 2.2)
    ctx.filter = `blur(${(1 - e) * 26}px) saturate(${0.4 + 0.6 * e})`
    ctx.drawImage(lighthouse(mood), x, y, w, h)
    ctx.filter = 'none'
  }
  ctx.restore()
  ctx.strokeStyle = C.line2
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 16)
  ctx.stroke()
}

function pending(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, t: number) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 16)
  ctx.clip()
  ctx.fillStyle = C.panel2
  ctx.fillRect(x, y, w, h)
  const sx = x + ((t * 0.6) % 1) * (w + 400) - 200
  const sh = ctx.createLinearGradient(sx - 200, 0, sx + 200, 0)
  sh.addColorStop(0, 'rgba(138,152,255,0)')
  sh.addColorStop(0.5, 'rgba(138,152,255,0.10)')
  sh.addColorStop(1, 'rgba(138,152,255,0)')
  ctx.fillStyle = sh
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  ctx.strokeStyle = C.line2
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 16)
  ctx.stroke()
  const tw = measure(ctx, label, { size: 18, family: MONO })
  spinner(ctx, x + w / 2 - tw / 2 - 18, y + h / 2 - 6, 9, t)
  text(ctx, label, x + w / 2 + 6, y + h / 2, { size: 18, family: MONO, color: C.soft, align: 'center' })
}

/** small picture-frame icon, like the IMAGE switch */
function frameIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(cx - s, cy - s * 0.8, s * 2, s * 1.6, 3)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - s + 2, cy + s * 0.6)
  ctx.lineTo(cx - s * 0.2, cy - s * 0.1)
  ctx.lineTo(cx + s * 0.3, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.6, cy + s * 0.1)
  ctx.lineTo(cx + s - 2, cy + s * 0.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + s * 0.45, cy - s * 0.35, s * 0.18, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

// ─── scenes ──────────────────────────────────────────────────────────────────

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Private image generation', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Make pictures with AI. Nobody knows who paid.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function bubble(ctx: CanvasRenderingContext2D, s: string, right: number, y: number, alpha: number) {
  const w = measure(ctx, s, { size: 22 }) + 44
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  ctx.roundRect(right - w, y, w, 56, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
  ctx.strokeStyle = C.line2
  ctx.stroke()
  text(ctx, s, right - w + 22, y + 36, { size: 22, color: C.fg })
  ctx.restore()
}

function meta(ctx: CanvasRenderingContext2D, x: number, y: number, secs: string, alpha: number, hint: boolean) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  const m1 = `Nano Banana 2 · image · ${secs} · $0.07 · `
  text(ctx, m1, x, y, { size: 15, family: MONO, color: C.dim })
  const w1 = measure(ctx, m1, { size: 15, family: MONO })
  text(ctx, 'paid privately', x + w1, y, { size: 15, family: MONO, color: C.ok })
  const w2 = measure(ctx, 'paid privately', { size: 15, family: MONO })
  check(ctx, x + w1 + w2 + 14, y - 5, 13, C.ok, 2.2)
  if (hint) text(ctx, 'reply to edit this image', x + w1 + w2 + 36, y, { size: 15, family: MONO, color: C.faint })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 17.6, 0.5, 0.45)
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
  if (t >= IMAGE_CUES.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'A glass lighthouse on a…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Nano Banana 2 · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  }
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 130, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  const spent = 0.000019 * (easeOut(prog(t, IMAGE_CUES.reveal[0], IMAGE_CUES.reveal[0] + 1)) + easeOut(prog(t, IMAGE_CUES.reveal2[0], IMAGE_CUES.reveal2[0] + 1)))
  text(ctx, (0.05 - spent).toFixed(6), X + 28, Y + H - 80, { size: 36, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + H - 80, { size: 16, family: MONO, color: C.muted })

  // top bar
  const M = X + 340
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(M, Y + 76)
  ctx.lineTo(X + W, Y + 76)
  ctx.stroke()
  const on = t >= IMAGE_CUES.toggle
  panel(ctx, M + 28, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, on ? 'Nano Banana 2  ⌄' : 'Claude Sonnet 5.5  ⌄', M + 46, Y + 46, { size: 16, family: MONO, color: C.fg })
  const keyOn = t >= IMAGE_CUES.steps[1]
  ctx.beginPath()
  ctx.roundRect(M + 300, Y + 24, keyOn ? 252 : 186, 32, 16)
  ctx.strokeStyle = keyOn ? 'rgba(67,211,146,0.4)' : C.line2
  ctx.stroke()
  text(ctx, keyOn ? '● PRIVATE KEY ACTIVE' : '● NO OPEN KEY', M + 318, Y + 45, { size: 13, family: MONO, color: keyOn ? C.ok : C.dim, spacing: '0.12em' })
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  // conversation (scrolls up when the edit arrives)
  const CX = M + 120
  const CW = 1060
  const top = Y + 80
  const bottom = Y + H - 166
  const scroll = easeInOut(prog(t, IMAGE_CUES.editSend, IMAGE_CUES.editSend + 0.7)) * 430
  ctx.save()
  ctx.beginPath()
  ctx.rect(M + 1, top, X + W - M - 2, bottom - top)
  ctx.clip()
  const oy = Y - scroll
  const IWD = 640
  const IHT = 360
  const PX = CX + 70
  if (t >= IMAGE_CUES.send) {
    bubble(ctx, PROMPT, CX + CW, oy + 120, easeOut(prog(t, IMAGE_CUES.send, IMAGE_CUES.send + 0.3)))
    const AY = oy + 210
    panel(ctx, CX, AY, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 20, 8, 1, 1, 2.5)
    if (t < IMAGE_CUES.reveal[0]) {
      const labels = ['Proving you can pay, without saying who…', 'Paid']
      IMAGE_CUES.steps.slice(0, 2).forEach((s, i) => {
        if (t < (i === 0 ? IMAGE_CUES.send : IMAGE_CUES.steps[i - 1])) return
        const y = AY + 26 + i * 40
        if (t >= s) doneDot(ctx, PX + 4, y - 7, 11)
        else spinner(ctx, PX + 4, y - 7, 9, t)
        text(ctx, labels[i], PX + 28, y, { size: 17, family: MONO, color: C.soft })
      })
      if (t >= IMAGE_CUES.steps[1]) pending(ctx, PX, AY + 100, IWD, IHT - 60, 'Painting your image privately…', t)
    } else {
      picture(ctx, PX, AY, IWD, IHT, 'night', prog(t, IMAGE_CUES.reveal[0], IMAGE_CUES.reveal[1]))
      meta(ctx, PX, AY + IHT + 36, '9.4s', easeOut(prog(t, IMAGE_CUES.reveal[1] - 0.2, IMAGE_CUES.reveal[1] + 0.3)), t < IMAGE_CUES.editSend)
    }
    if (t >= IMAGE_CUES.editSend) {
      bubble(ctx, EDIT, CX + CW, oy + 650, easeOut(prog(t, IMAGE_CUES.editSend, IMAGE_CUES.editSend + 0.3)))
      const BY = oy + 740
      panel(ctx, CX, BY, 40, 40, 8, C.panel, C.line2)
      nullMark(ctx, CX + 20, BY + 20, 8, 1, 1, 2.5)
      if (t < IMAGE_CUES.reveal2[0]) pending(ctx, PX, BY, IWD, IHT, 'Editing your image privately…', t)
      else {
        picture(ctx, PX, BY, IWD, IHT, 'sunrise', prog(t, IMAGE_CUES.reveal2[0], IMAGE_CUES.reveal2[1]))
        meta(ctx, PX, BY + IHT + 36, '8.1s', easeOut(prog(t, IMAGE_CUES.reveal2[1] - 0.2, IMAGE_CUES.reveal2[1] + 0.3)), true)
      }
    }
  }
  ctx.restore()

  // format row
  const FY = Y + H - 146
  const fa = easeOut(prog(t, IMAGE_CUES.toggle, IMAGE_CUES.toggle + 0.3))
  if (fa > 0) {
    ctx.save()
    ctx.globalAlpha *= fa
    text(ctx, 'FORMAT', CX, FY, { size: 13, family: MONO, color: C.dim, spacing: '0.12em' })
    const sel = t >= IMAGE_CUES.aspect ? '16:9' : '1:1'
    ;['1:1', '16:9', '9:16'].forEach((f, i) => {
      const fx = CX + 82 + i * 70
      const act = f === sel
      ctx.beginPath()
      ctx.roundRect(fx, FY - 19, 60, 26, 6)
      ctx.fillStyle = act ? 'rgba(138,152,255,0.12)' : 'rgba(0,0,0,0)'
      ctx.fill()
      ctx.strokeStyle = act ? 'rgba(138,152,255,0.5)' : C.line2
      ctx.lineWidth = 1.2
      ctx.stroke()
      text(ctx, f, fx + 30, FY - 1, { size: 13, family: MONO, color: act ? C.eth : C.dim, align: 'center' })
    })
    const right = t >= IMAGE_CUES.reveal[1] ? 'your next message edits the last image' : 'describe a picture'
    text(ctx, `≈ 7¢ per image · ${right}`, CX + CW, FY, { size: 13, family: MONO, color: C.dim, align: 'right' })
    ctx.restore()
  }

  // composer with WEB and IMAGE
  const BY = Y + H - 120
  panel(ctx, CX, BY, CW, 62, 14, C.panel, C.line2)
  ctx.beginPath()
  ctx.roundRect(CX + 10, BY + 9, 86, 44, 10)
  ctx.strokeStyle = C.line2
  ctx.lineWidth = 1.5
  ctx.stroke()
  text(ctx, 'WEB', CX + 53, BY + 37, { size: 15, family: MONO, color: C.dim, align: 'center', spacing: '0.08em' })
  ctx.beginPath()
  ctx.roundRect(CX + 104, BY + 9, 112, 44, 10)
  ctx.fillStyle = on ? 'rgba(138,152,255,0.12)' : 'rgba(0,0,0,0)'
  ctx.fill()
  ctx.strokeStyle = on ? 'rgba(138,152,255,0.5)' : C.line2
  ctx.stroke()
  frameIcon(ctx, CX + 128, BY + 31, 9, on ? C.eth : C.dim)
  text(ctx, 'IMAGE', CX + 146, BY + 37, { size: 15, family: MONO, color: on ? C.eth : C.dim, spacing: '0.08em' })
  const pulse = prog(t, IMAGE_CUES.toggle - 0.05, IMAGE_CUES.toggle + 0.6)
  if (pulse > 0 && pulse < 1) {
    ctx.beginPath()
    ctx.roundRect(CX + 104 - pulse * 14, BY + 9 - pulse * 14, 112 + pulse * 28, 44 + pulse * 28, 10 + pulse * 10)
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.5 * (1 - pulse)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  const TX = CX + 234
  let typed = ''
  let ph = on ? 'Describe an image…' : 'Ask privately…'
  if (t < IMAGE_CUES.send) typed = PROMPT.slice(0, Math.floor(prog(t, IMAGE_CUES.typeStart, IMAGE_CUES.typeEnd) * PROMPT.length))
  else if (t < IMAGE_CUES.editSend) {
    typed = EDIT.slice(0, Math.floor(prog(t, IMAGE_CUES.editTypeStart, IMAGE_CUES.editTypeEnd) * EDIT.length))
    if (t >= IMAGE_CUES.reveal[1]) ph = 'Describe a change, e.g. “make it night”…'
  } else ph = 'Describe a change, e.g. “make it night”…'
  text(ctx, typed || ph, TX, BY + 40, { size: 22, color: typed ? C.fg : C.dim })
  const typing = (t > IMAGE_CUES.typeStart && t < IMAGE_CUES.send) || (t > IMAGE_CUES.editTypeStart && t < IMAGE_CUES.editSend)
  if (typing && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(TX + 2 + measure(ctx, typed, { size: 22 }), BY + 18, 3, 28)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 9, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 40, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'your wallet stays private · images are saved only in your browser', CX + CW / 2, Y + H - 28, { size: 13, family: MONO, color: C.dim, align: 'center' })
  ctx.restore()
}

const POINTS = [
  { k: 'Make images privately.', v: 'Describe a picture. It appears in seconds.' },
  { k: 'Edit with words.', v: 'Reply “make it sunrise” and it changes.' },
  { k: 'Nobody knows who paid.', v: 'Paid from your private ETH balance with a proof.' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 17.6, IMAGE_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'ONE SWITCH: IMAGE', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, IMAGE_CUES.points[i], IMAGE_CUES.points[i] + 0.5))
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
  const a = easeOut(prog(t, IMAGE_CUES.end + 0.1, IMAGE_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Private images are live.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'In NULL Chat. Paid with ETH, not with your identity.', 960, 610, { size: 32, color: C.muted, align: 'center' })
  text(ctx, `${PROJECT.domain}/chat`, 960, 730, { size: 40, family: MONO, color: C.fg, align: 'center' })
  text(ctx, PROJECT.xHandle, 960, 790, { size: 26, family: MONO, color: C.muted, align: 'center' })
  if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 920, { size: 22, family: MONO, color: C.muted, align: 'center' })
  ctx.restore()
}

/** Only the very edges darken, so the pictures keep their colour. */
function softEdges(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(960, 540, 700, 960, 540, 1250)
  g.addColorStop(0, 'rgba(6,6,7,0)')
  g.addColorStop(1, 'rgba(6,6,7,0.7)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1920, 1080)
}

export function drawImageFilm(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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

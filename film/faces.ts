// "Face Shield": ~27 s promo. Title → a team photo is dropped into the chat → the detector
// finds four faces → each is shrunk to a few pixels and smoothed (the same steps the app uses)
// → you can switch it off and on → a question, an answer about the scene → how it runs → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const FACES_DURATION = 27

export const FACES_CUES = {
  drag: [3.5, 4.2],
  ready: 4.9,
  photo: 5.0,
  scan: [5.6, 6.4],
  boxes: [6.4, 6.6, 6.8, 7.0],
  blur: [7.8, 8.6],
  off: 10.2,
  on: 11.3,
  typeStart: 12.0,
  typeEnd: 12.9,
  send: 13.3,
  streamStart: 13.9,
  streamEnd: 15.6,
  hops: [18.2, 19.0, 19.8, 20.6],
  end: 22.6,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const WARN_RGB = '224,180,94'
const NAME = 'team_photo.jpg'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Face Shield', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Faces in your photos are blurred before the AI sees them.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

const CLIP = new Path2D('m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48')
const SCAN_FACE = new Path2D('M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01')

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

// ── the team photo (drawn, then blurred the way the app does it) ─────────────

const PEOPLE = [
  { x: 0.17, coat: '#f2f2f0', skin: '#e7bfa0', hair: '#6b4a2f', steth: true },
  { x: 0.39, coat: '#7a2338', skin: '#b98262', hair: '#1d1612', steth: false },
  { x: 0.61, coat: '#3f9a8c', skin: '#f0cdb2', hair: '#d9b77a', steth: true },
  { x: 0.83, coat: '#f4f4f2', skin: '#efc8a8', hair: '#caa064', steth: false },
]

let scratch: HTMLCanvasElement | null = null
let tiny: HTMLCanvasElement | null = null

/** head box of person i in a w×h photo */
const head = (i: number, w: number, h: number) => {
  const r = h * 0.13
  return { cx: w * PEOPLE[i].x, cy: h * 0.33 + (i % 2) * h * 0.02, r }
}

/** Draws the photo at (x, y, w, h); `blur[i]` 0..1 blurs face i like Face Shield does. */
function teamPhoto(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, blur: number[], radius = 12) {
  const S = 2
  scratch ??= document.createElement('canvas')
  const c = scratch
  c.width = Math.round(w * S)
  c.height = Math.round(h * S)
  const g = c.getContext('2d')!
  g.setTransform(S, 0, 0, S, 0, 0)
  const bg = g.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#f6f6f4')
  bg.addColorStop(1, '#e4e4e0')
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  PEOPLE.forEach((p, i) => {
    const { cx, cy, r } = head(i, w, h)
    // body
    g.fillStyle = p.coat
    g.beginPath()
    g.moveTo(cx - r * 2.1, h)
    g.quadraticCurveTo(cx - r * 2.2, cy + r * 1.6, cx - r * 0.9, cy + r * 1.35)
    g.lineTo(cx + r * 0.9, cy + r * 1.35)
    g.quadraticCurveTo(cx + r * 2.2, cy + r * 1.6, cx + r * 2.1, h)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(0,0,0,0.12)'
    g.lineWidth = 1
    g.stroke()
    // neck
    g.fillStyle = p.skin
    g.fillRect(cx - r * 0.32, cy + r * 0.7, r * 0.64, r * 0.75)
    if (p.steth) {
      g.strokeStyle = '#2a2a2a'
      g.lineWidth = r * 0.08
      g.beginPath()
      g.arc(cx, cy + r * 1.75, r * 0.65, Math.PI * 1.1, Math.PI * 1.9, true)
      g.stroke()
      g.fillStyle = '#9aa0a6'
      g.beginPath()
      g.arc(cx + r * 0.2, cy + r * 2.45, r * 0.16, 0, Math.PI * 2)
      g.fill()
    }
    // hair behind
    g.fillStyle = p.hair
    g.beginPath()
    g.ellipse(cx, cy - r * 0.05, r * 1.12, r * 1.2, 0, Math.PI, 0)
    g.fill()
    if (i !== 1) g.fillRect(cx - r * 1.12, cy - r * 0.05, r * 0.4, r * 1.3)
    // face
    g.fillStyle = p.skin
    g.beginPath()
    g.ellipse(cx, cy + r * 0.08, r * 0.86, r * 1.02, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = p.hair
    g.beginPath()
    g.ellipse(cx, cy - r * 0.62, r * 0.88, r * 0.42, 0, Math.PI, 0)
    g.fill()
    // features: what makes a face a face
    g.fillStyle = '#2b211c'
    g.beginPath()
    g.ellipse(cx - r * 0.32, cy, r * 0.09, r * 0.11, 0, 0, Math.PI * 2)
    g.ellipse(cx + r * 0.32, cy, r * 0.09, r * 0.11, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#2b211c'
    g.lineWidth = r * 0.06
    g.beginPath()
    g.moveTo(cx - r * 0.48, cy - r * 0.22)
    g.lineTo(cx - r * 0.16, cy - r * 0.26)
    g.moveTo(cx + r * 0.16, cy - r * 0.26)
    g.lineTo(cx + r * 0.48, cy - r * 0.22)
    g.stroke()
    g.strokeStyle = 'rgba(120,70,50,0.6)'
    g.beginPath()
    g.moveTo(cx, cy + r * 0.05)
    g.lineTo(cx - r * 0.08, cy + r * 0.32)
    g.lineTo(cx + r * 0.04, cy + r * 0.34)
    g.stroke()
    g.strokeStyle = '#a2453f'
    g.lineWidth = r * 0.08
    g.beginPath()
    g.arc(cx, cy + r * 0.38, r * 0.28, Math.PI * 0.15, Math.PI * 0.85)
    g.stroke()
  })
  // Face Shield: shrink each face to a few pixels, smooth it back up inside an ellipse
  tiny ??= document.createElement('canvas')
  PEOPLE.forEach((_, i) => {
    const p = clamp(blur[i] ?? 0)
    if (!p) return
    const { cx, cy, r } = head(i, w, h)
    const bw = r * 2.4 * S
    const bh = r * 2.7 * S
    const bx = cx * S - bw / 2
    const by = cy * S - bh / 2
    tiny!.width = 6
    tiny!.height = 7
    const tg = tiny!.getContext('2d')!
    tg.imageSmoothingQuality = 'high'
    tg.drawImage(c, bx, by, bw, bh, 0, 0, 6, 7)
    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = p
    g.beginPath()
    g.ellipse(cx * S, cy * S, bw / 2, bh / 2, 0, 0, Math.PI * 2)
    g.clip()
    g.imageSmoothingEnabled = true
    g.filter = `blur(${Math.round(bw / 9)}px)`
    g.drawImage(tiny!, bx - bw * 0.1, by - bh * 0.1, bw * 1.2, bh * 1.2)
    g.restore()
  })
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()
  ctx.drawImage(c, x, y, w, h)
  ctx.restore()
}

function fileCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, note: string, color: string, blur: number, busy: boolean, toggleOn: boolean | null, t: number) {
  panel(ctx, x, y, w, 58, 10, C.panel, C.line2)
  if (busy) {
    panel(ctx, x + 9, y + 9, 40, 40, 6, C.panel, C.line2)
    spinner(ctx, x + 29, y + 29, 8, t)
  } else teamPhoto(ctx, x + 9, y + 9, 40, 40, [blur, blur, blur, blur], 6)
  text(ctx, NAME, x + 60, y + 25, { size: 15, color: C.fg })
  text(ctx, note, x + 60, y + 45, { size: 11.5, family: MONO, color })
  if (toggleOn !== null) icon(ctx, SCAN_FACE, x + w - 50, y + 29, 18, toggleOn ? C.ok : C.warn, 2)
  text(ctx, '×', x + w - 18, y + 34, { size: 18, color: C.dim, align: 'center' })
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = FACES_CUES
  const a = win(t, 3.1, 17.5, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  const X = 120
  const Y = 90 + rise
  const W = 1680
  const H = 900
  panel(ctx, X, Y, W, H, 22, C.panel, C.line2)

  // sidebar + top bar
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
  if (t >= K.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'What are these people wear…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Claude Sonnet 5.5 · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  } else text(ctx, 'Your chats stay in this browser.', X + 170, Y + 186, { size: 16, color: C.dim, align: 'center' })
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 130, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  text(ctx, '0.049918', X + 28, Y + H - 80, { size: 36, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + H - 80, { size: 16, family: MONO, color: C.muted })
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
  const sent = t >= K.send
  // how blurred the faces are right now (the toggle switches them off and on)
  const blurOf = (i: number) => {
    const on = easeOut(prog(t, K.blur[0] + i * 0.12, K.blur[0] + 0.5 + i * 0.12))
    const off = easeOut(prog(t, K.off, K.off + 0.3))
    const back = easeOut(prog(t, K.on, K.on + 0.3))
    return on * (1 - off + back)
  }
  const blurs = PEOPLE.map((_, i) => blurOf(i))
  const shown = t >= K.off && t < K.on

  // empty chat
  const ea = 1 - prog(t, K.photo - 0.4, K.photo)
  if (ea > 0) {
    ctx.save()
    ctx.globalAlpha *= ea
    nullMark(ctx, mid, Y + 250, 26, 1, 1, 5)
    text(ctx, 'Ask privately.', mid, Y + 340, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    text(ctx, 'Attach photos: location removed, faces blurred, in your browser', mid, Y + 394, { size: 18, family: MONO, color: C.dim, align: 'center' })
    ctx.restore()
  }

  // ── the photo, the detector, the blur ──
  const pa = win(t, K.photo, K.typeStart - 0.1, 0.45, 0.35)
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    const PY = Y + 110 + (1 - easeOut(prog(t, K.photo, K.photo + 0.5))) * 16
    panel(ctx, CX, PY, CW, 470, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, NAME, CX + 30, PY + 44, { size: 14, family: MONO, color: C.dim, spacing: '0.06em' })
    const PX = CX + 30
    const PW = 620
    const PH = 380
    const PYY = PY + 64
    teamPhoto(ctx, PX, PYY, PW, PH, blurs)
    // the detector's sweep
    const sc = prog(t, K.scan[0], K.scan[1])
    if (sc > 0 && sc < 1) {
      const sx = PX + PW * easeInOut(sc)
      const g = ctx.createLinearGradient(sx - 60, 0, sx, 0)
      g.addColorStop(0, `rgba(${OK_RGB},0)`)
      g.addColorStop(1, `rgba(${OK_RGB},0.3)`)
      ctx.fillStyle = g
      ctx.fillRect(sx - 60, PYY, 60, PH)
      ctx.fillStyle = `rgba(${OK_RGB},0.9)`
      ctx.fillRect(sx, PYY, 2, PH)
    }
    // boxes
    PEOPLE.forEach((_, i) => {
      const ba = easeOut(prog(t, K.boxes[i], K.boxes[i] + 0.2)) * (1 - prog(t, K.blur[1] + 0.6, K.blur[1] + 1.2))
      if (!ba) return
      const { cx, cy, r } = head(i, PW, PH)
      ctx.save()
      ctx.globalAlpha *= ba
      ctx.strokeStyle = C.ok
      ctx.lineWidth = 2.5
      ctx.strokeRect(PX + cx - r * 0.95, PYY + cy - r * 1.15, r * 1.9, r * 2.3)
      ctx.fillStyle = C.ok
      ctx.fillRect(PX + cx - r * 0.95, PYY + cy - r * 1.15 - 22, 88, 22)
      text(ctx, 'face 1.00', PX + cx - r * 0.95 + 6, PYY + cy - r * 1.15 - 6, { size: 13, family: MONO, color: '#06281a' })
      ctx.restore()
    })
    // the explanation on the right
    const RX = CX + 690
    text(ctx, 'FACE SHIELD', RX, PY + 110, { size: 14, family: MONO, color: C.ok, spacing: '0.16em' })
    const steps = [
      { at: K.scan[0], s: 'find the faces', d: 'a 1.6 MB detector, in this browser' },
      { at: K.blur[0], s: 'shrink each to 6 pixels', d: 'that is where the identity is lost' },
      { at: K.blur[1], s: 'smooth it back up', d: 'what is left is a soft blur' },
    ]
    steps.forEach((st, i) => {
      const sa = easeOut(prog(t, st.at, st.at + 0.35))
      if (!sa) return
      const y = PY + 170 + i * 80
      ctx.save()
      ctx.globalAlpha *= sa
      text(ctx, `${i + 1}`, RX, y, { size: 26, weight: 600, color: C.faint })
      text(ctx, st.s, RX + 34, y, { size: 24, weight: 500, color: C.fg })
      text(ctx, st.d, RX + 34, y + 28, { size: 14, family: MONO, color: C.dim })
      ctx.restore()
    })
    const ca = easeOut(prog(t, K.blur[1] + 0.4, K.blur[1] + 0.9))
    const msg = shown ? 'your call: faces will be sent as they are' : '4 faces blurred before anything is sent'
    text(ctx, msg, RX, PY + 430, { size: 14.5, family: MONO, color: shown ? C.warn : C.ok, alpha: ca })
    ctx.restore()
  }

  // ── after sending ──
  if (sent) {
    const ua = easeOut(prog(t, K.send, K.send + 0.3))
    ctx.save()
    ctx.globalAlpha *= ua
    teamPhoto(ctx, CX + CW - 300, Y + 110, 300, 184, [1, 1, 1, 1], 12)
    const q = 'What are these people wearing?'
    const qw = measure(ctx, q, { size: 21 }) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 310, qw, 52, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, q, CX + CW - qw + 22, Y + 343, { size: 21, color: C.fg })
    const note = 'cleaned in your browser · 4 faces blurred'
    const nw = measure(ctx, note, { size: 13, family: MONO })
    shieldIcon(ctx, CX + CW - nw - 16, Y + 385, 7, C.ok)
    text(ctx, note, CX + CW - nw, Y + 390, { size: 13, family: MONO, color: C.ok })
    ctx.restore()

    const AY = Y + 450
    panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
    if (t < K.streamStart) {
      spinner(ctx, CX + 74, AY + 12, 9, t)
      text(ctx, 'Routing privately…', CX + 98, AY + 19, { size: 17, family: MONO, color: C.soft })
    } else {
      const lines = ['Two are in white lab coats with stethoscopes,', 'one is in burgundy scrubs and one in teal scrubs.', 'It looks like a hospital team.']
      const total = lines.reduce((n, l) => n + l.length, 0)
      let budget = Math.floor(prog(t, K.streamStart, K.streamEnd) * total)
      lines.forEach((l, i) => {
        if (budget <= 0) return
        text(ctx, l.slice(0, budget), CX + 70, AY + 22 + i * 42, { size: 24, color: C.soft })
        budget -= l.length
      })
      const ma = easeOut(prog(t, K.streamEnd, K.streamEnd + 0.4))
      if (ma > 0) {
        const my = AY + 22 + lines.length * 42 + 14
        ctx.save()
        ctx.globalAlpha *= ma
        const m1 = 'Claude Sonnet 5.5 · 2.3s · '
        text(ctx, m1, CX + 70, my, { size: 15, family: MONO, color: C.dim })
        const mx = CX + 70 + measure(ctx, m1, { size: 15, family: MONO })
        text(ctx, 'paid privately', mx, my, { size: 15, family: MONO, color: C.ok })
        check(ctx, mx + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        text(ctx, 'it saw the scene, not the faces', CX + 70, my + 30, { size: 15, family: MONO, color: C.faint })
        ctx.restore()
      }
    }
  }

  // ── attach tray ──
  const dropped = t >= K.drag[1]
  if (dropped && !sent) {
    const ca = easeOut(prog(t, K.drag[1] + 0.05, K.drag[1] + 0.35))
    ctx.save()
    ctx.globalAlpha *= ca
    const busy = t < K.ready
    const done = t >= K.blur[1]
    const cardBlur = done ? (shown ? 0 : 1) : 0
    const note = busy ? 'opening in your browser…' : !done ? 'looking for faces…' : shown ? '4 faces shown' : '4 faces blurred'
    const color = busy || !done ? C.dim : shown ? C.warn : C.ok
    fileCard(ctx, CX, BY - 84 + (1 - ca) * 14, 340, note, color, cardBlur, busy, done ? !shown : null, t)
    ctx.restore()
  }

  // composer
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const btn = (bx: number, w: number, label: string, on: boolean, shield = false, clip = false) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = on ? `rgba(${OK_RGB},0.08)` : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = on ? `rgba(${OK_RGB},0.4)` : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (shield) shieldIcon(ctx, bx + 22, BY + 48, 8, C.ok)
    if (clip) icon(ctx, CLIP, bx + 23, BY + 48, 22, on ? C.ok : C.dim, 2)
    text(ctx, label, shield || clip ? bx + 40 : bx + w / 2, BY + 54, { size: 14, family: MONO, color: on ? C.ok : C.dim, align: shield || clip ? 'left' : 'center', spacing: '0.08em' })
  }
  btn(CX + 12, 62, dropped && !sent ? '1' : '', dropped && !sent, false, true)
  btn(CX + 84, 74, 'WEB', false)
  btn(CX + 166, 92, 'IMAGE', false)
  btn(CX + 266, 112, 'SHIELD', true, true)
  const TX = CX + 400
  if (!sent) {
    const q = 'What are these people wearing?'
    const n = Math.floor(prog(t, K.typeStart, K.typeEnd) * q.length)
    if (n <= 0) text(ctx, dropped ? 'Ask about your files…' : 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
    else {
      const w = text(ctx, q.slice(0, n), TX, BY + 56, { size: 21, color: C.fg })
      if (Math.floor(t * 2.4) % 2 === 0) {
        ctx.fillStyle = C.eth
        ctx.fillRect(TX + w + 2, BY + 36, 3, 26)
      }
    }
  } else text(ctx, 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 26, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 57, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'payment identity hidden · personal details shielded, the model reads the rest', CX + CW / 2, Y + H - 24, { size: 13, family: MONO, color: C.ok, align: 'center' })

  // the drag
  const dg = prog(t, K.drag[0], K.drag[1])
  const dga = win(t, K.drag[0] - 0.2, K.drag[1] + 0.15, 0.2, 0.15)
  if (dga > 0) {
    const e = easeInOut(dg)
    const px = X + W + 60 + (CX + 520 - X - W - 60) * e
    const py = Y + 380 + (BY + 30 - Y - 380) * e
    ctx.save()
    ctx.globalAlpha *= dga
    teamPhoto(ctx, px + 10, py + 6, 90, 56, [0, 0, 0, 0], 6)
    ctx.restore()
    pointer(ctx, px, py, dga)
  }
  // the toggle: off, then on again
  const tx = CX + 340 - 50
  const ty = BY - 84 + 29
  const tp = win(t, K.off - 0.7, K.on + 0.5, 0.25, 0.3)
  if (tp > 0) {
    const m = easeInOut(prog(t, K.off - 0.7, K.off - 0.1))
    pointer(ctx, CX + 560 + (tx - CX - 560) * m - 2, BY - 20 + (ty - BY + 20) * m - 4, tp)
    for (const at of [K.off, K.on]) {
      const r = prog(t, at, at + 0.45)
      if (r > 0 && r < 1) {
        ctx.beginPath()
        ctx.arc(tx, ty, 8 + r * 24, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${at === K.off ? WARN_RGB : OK_RGB},${0.6 * (1 - r)})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

const HOPS = [
  { k: 'YOUR PHOTO', v: 'faces visible' },
  { k: 'FACE DETECTOR', v: '4 faces found' },
  { k: 'FACE SHIELD', v: '4 faces blurred' },
  { k: 'THE MODEL', v: 'sees the scene' },
]

function howItRuns(ctx: CanvasRenderingContext2D, t: number) {
  const K = FACES_CUES
  const a = win(t, 17.3, K.end, 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HOW IT RUNS', 960, 220, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Faces are gone before the photo leaves.', 960, 288, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })
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
    teamPhoto(ctx, x + 26, 528, 92, 86, i < 2 ? [0, 0, 0, 0] : [1, 1, 1, 1], 8)
    text(ctx, h.v, x + 134, 580, { size: 24, weight: 600, spacing: '-0.5px', color: lit ? C.fg : C.muted })
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
    }
  })
  const fa = easeOut(prog(t, K.hops[3] + 0.3, K.hops[3] + 0.8))
  text(ctx, '1.6 MB · a fraction of a second per photo · on by default, one click to undo', 960, 770, { size: 20, family: MONO, color: C.muted, align: 'center', alpha: fa })
  text(ctx, 'very small faces in big crowds can be missed', 960, 810, { size: 16, family: MONO, color: C.dim, align: 'center', alpha: fa })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = FACES_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Share the scene. Keep the faces.', 960, 540, { size: 80, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Face Shield, live in NULL Chat. Attach a photo.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawFaces(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  howItRuns(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

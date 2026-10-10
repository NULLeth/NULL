// "This week on NULL": ~24 s recap. Title → seven cards, one per update shipped Oct 6–11,
// each with its icon, a one-line what-it-does and its date → the idea behind all of them → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, clamp, easeInOut, easeOut, glow, grid, network, nullMark, panel, prog, text, win } from './kit'

export const WEEK_DURATION = 22

export const WEEK_CUES = {
  cards: [3.6, 4.5, 5.4, 6.3, 7.2, 8.1, 9.0],
  idea: [12.6, 17.0],
  end: 17.4,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'

// lucide icons (24×24), rects and circles written as paths
const ICONS = {
  shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4',
  file: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z M14 2v5a1 1 0 0 0 1 1h5 M10 9H8 M16 13H8 M16 17H8',
  mic: 'M12 19v3 M19 10v2a7 7 0 0 1-14 0v-2 M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Z',
  face: 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01',
  text: 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 8h8 M7 12h10 M7 16h6',
  lock: 'M5 10h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z M7 10V7a5 5 0 0 1 10 0v3 M13 16a1 1 0 1 1-2 0a1 1 0 1 1 2 0',
  telescope:
    'm10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44 M13.56 11.747l4.332-.924 M16 21l-3.105-6.21 M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z M6.158 8.633l1.114 4.456 M8 21l3.105-6.21 M14 13a2 2 0 1 1-4 0a2 2 0 1 1 4 0',
}

const CARDS: { icon: keyof typeof ICONS; name: string; line: [string, string]; date: string }[] = [
  { icon: 'shield', name: 'AI Shield', line: ['A small AI in your browser hides', 'names, places and companies.'], date: 'OCT 6' },
  { icon: 'file', name: 'Private Files', line: ['PDFs go as text, photos', 'lose their GPS location.'], date: 'OCT 7' },
  { icon: 'mic', name: 'Private Voice', line: ['Speech to text on your device.', 'Your voice is never sent.'], date: 'OCT 7' },
  { icon: 'face', name: 'Face Shield', line: ['Faces in your photos are', 'blurred before they leave.'], date: 'OCT 8' },
  { icon: 'text', name: 'Screenshot Shield', line: ['Emails, wallets and IBANs', 'in pictures are covered.'], date: 'OCT 9' },
  { icon: 'lock', name: 'Encrypted Backup', line: ['Your chats, your file,', 'your key. Any device.'], date: 'OCT 10' },
  { icon: 'telescope', name: 'Deep Research', line: ['Cited reports, every search', 'paid with a ZK proof.'], date: 'OCT 11' },
]

const paths = new Map<string, Path2D>()
function icon(ctx: CanvasRenderingContext2D, key: keyof typeof ICONS, cx: number, cy: number, size: number, color: string) {
  let p = paths.get(key)
  if (!p) paths.set(key, (p = new Path2D(ICONS[key])))
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = (2 * 24) / size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(p)
  ctx.restore()
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.2, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'This week on NULL', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, '7 privacy updates in 6 days.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function cards(ctx: CanvasRenderingContext2D, t: number) {
  const K = WEEK_CUES
  const a = win(t, 3.0, K.idea[0] + 0.4, 0.4, 0.5)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const shipped = K.cards.filter((c) => t >= c).length
  text(ctx, 'SHIPPED THIS WEEK', 960, 170, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, `${shipped} update${shipped === 1 ? '' : 's'}. One idea.`, 960, 236, { size: 52, weight: 500, align: 'center', spacing: '-1.5px' })
  const W = 400
  const H = 250
  const G = 30
  CARDS.forEach((c, i) => {
    const ca = easeOut(prog(t, K.cards[i], K.cards[i] + 0.45))
    if (!ca) return
    const row = i < 4 ? 0 : 1
    const col = row ? i - 4 : i
    const n = row ? 3 : 4
    const x0 = (1920 - (n * W + (n - 1) * G)) / 2
    const x = x0 + col * (W + G)
    const y = 300 + row * (H + G) + (1 - ca) * 18
    const fresh = 1 - prog(t, K.cards[i] + 0.3, K.cards[i] + 1.4)
    ctx.save()
    ctx.globalAlpha *= ca
    panel(ctx, x, y, W, H, 18, C.panel, `rgba(${i === 6 ? ETH_RGB : OK_RGB},${0.18 + 0.4 * fresh})`)
    if (fresh > 0) glow(ctx, x + 56, y + 62, 90, i === 6 ? ETH_RGB : OK_RGB, 0.12 * fresh)
    icon(ctx, c.icon, x + 56, y + 62, 40, i === 6 ? C.eth : C.ok)
    text(ctx, c.date, x + W - 28, y + 50, { size: 14, family: MONO, color: C.dim, align: 'right', spacing: '0.12em' })
    text(ctx, c.name, x + 32, y + 140, { size: 32, weight: 600, spacing: '-1px' })
    text(ctx, c.line[0], x + 32, y + 184, { size: 19, color: C.muted })
    text(ctx, c.line[1], x + 32, y + 212, { size: 19, color: C.muted })
    ctx.restore()
  })
  const fa = easeOut(prog(t, K.cards[6] + 0.8, K.cards[6] + 1.4))
  text(ctx, 'six run inside your browser · all of it paid with a zero-knowledge proof · no account', 960, 880, { size: 20, family: MONO, color: C.muted, align: 'center', alpha: fa })
  ctx.restore()
}

function idea(ctx: CanvasRenderingContext2D, t: number) {
  const K = WEEK_CUES
  const a = win(t, K.idea[0], K.idea[1], 0.5, 0.5)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 540, 520, OK_RGB, 0.05)
  text(ctx, 'THE IDEA BEHIND ALL OF THEM', 960, 400, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'The AI gets your question.', 960, 510, { size: 78, weight: 600, align: 'center', spacing: '-2.5px', alpha: easeOut(prog(t, K.idea[0] + 0.2, K.idea[0] + 0.8)) })
  text(ctx, 'Not you.', 960, 610, { size: 78, weight: 600, align: 'center', spacing: '-2.5px', color: C.ok, alpha: easeOut(prog(t, K.idea[0] + 1.0, K.idea[0] + 1.6)) })
  text(ctx, 'not your name, not your wallet, not your face, not your voice', 960, 700, {
    size: 22,
    family: MONO,
    color: C.dim,
    align: 'center',
    alpha: easeOut(prog(t, K.idea[0] + 1.8, K.idea[0] + 2.4)),
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = WEEK_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Private AI, every day better.', 960, 540, { size: 80, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'All live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawWeek(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  cards(ctx, t)
  idea(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

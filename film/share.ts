// "Private Share Links": ~28 s promo. Title → an answer with real names → share: details kept
// out, create link → the link split in two: what the server gets (/s) and what stays in the
// browser (the answer, after "#") → the reader's page with placeholders → options → end card.
// The link length and the shared text are what NULL Chat produced in the test.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const SHARE_DURATION = 28

export const SHARE_CUES = {
  share: 5.2,
  dialog: 5.5,
  create: 7.4,
  link: 7.8,
  copy: 9.2,
  split: [11.2, 16.4],
  request: 13.0,
  reader: [16.2, 21.4],
  points: [21.9, 22.3, 22.7],
  end: 24.4,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const Q = 'Write a short email to my landlord Jonas Weber. My number is +49 151 2345 6789.'
const Q_SHARED = 'Write a short email to my landlord [NAME_1]. My number is [PHONE_1].'
const A = ['Hi Jonas Weber,', 'Thanks for getting back to me so quickly.', 'You can reach me any time at +49 151 2345 6789.', 'Best regards']
const A_SHARED = ['Hi [NAME_1],', 'Thanks for getting back to me so quickly.', 'You can reach me any time at [PHONE_1].', 'Best regards']
const HASH = '#1.p.TY_BSgNBEER_pejzZs1GY3A9KQjxkOhBEElEOjud7JDZmaRn1rCI…'
const LINK = `nullzk.com/s${HASH}`
const HASH_SHORT = '#1.p.TY_BSgNBEER_pejzZs1GY3A9KQjxkOhBEElEOjud7…'
const LINK_ICON = new Path2D('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')

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

function ripple(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, at: number, rgb = OK_RGB) {
  const r = prog(t, at, at + 0.45)
  if (r <= 0 || r >= 1) return
  ctx.beginPath()
  ctx.arc(x, y, 8 + r * 24, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${rgb},${0.6 * (1 - r)})`
  ctx.lineWidth = 2
  ctx.stroke()
}

/** text where [TAGS] are drawn as small eth pills */
function tagged(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string) {
  let cx = x
  for (const part of s.split(/(\[[A-Z]+_\d+\])/)) {
    if (!part) continue
    if (/^\[[A-Z]+_\d+\]$/.test(part)) {
      const w = measure(ctx, part, { size: size * 0.9, family: MONO })
      ctx.fillStyle = `rgba(${ETH_RGB},0.12)`
      ctx.beginPath()
      ctx.roundRect(cx - 2, y - size * 0.85, w + 4, size * 1.2, 4)
      ctx.fill()
      cx += text(ctx, part, cx, y, { size: size * 0.9, family: MONO, color: C.eth }) + 2
    } else cx += text(ctx, part, cx, y, { size, color })
  }
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  icon(ctx, LINK_ICON, 960, 420, 130 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Private Share Links', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Share an AI answer without uploading it.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = SHARE_CUES
  const a = win(t, 3.1, K.split[0] + 0.2, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 120
  const Y = 90 + (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  panel(ctx, X, Y, 1680, 900, 22, C.panel, C.line2)
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  ctx.fillRect(X + 1, Y + 1, 340, 898)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X + 340, Y)
  ctx.lineTo(X + 340, Y + 900)
  ctx.stroke()
  nullMark(ctx, X + 44, Y + 46, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 53, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 53, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.roundRect(X + 16, Y + 100, 308, 64, 8)
  ctx.fill()
  text(ctx, 'Write a short email to my…', X + 32, Y + 128, { size: 17, color: C.fg })
  text(ctx, 'Claude Sonnet 5.5 · just now', X + 32, Y + 152, { size: 13, family: MONO, color: C.dim })

  const CX = X + 460
  const CW = 1060
  // the question and the answer with real details (filled back in on this device)
  const qw = measure(ctx, Q, { size: 19 }) + 44
  ctx.beginPath()
  ctx.roundRect(CX + CW - qw, Y + 60, qw, 48, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
  ctx.strokeStyle = C.line2
  ctx.stroke()
  text(ctx, Q, CX + CW - qw + 22, Y + 91, { size: 19, color: C.fg })
  text(ctx, '2 hidden from the AI · show what it saw', CX + CW, Y + 134, { size: 13, family: MONO, color: C.ok, align: 'right' })
  panel(ctx, CX, Y + 164, 40, 40, 8, C.panel, C.line2)
  nullMark(ctx, CX + 20, Y + 184, 8, 1, 1, 2.5)
  A.forEach((l, i) => text(ctx, l, CX + 70, Y + 190 + i * 42, { size: 23, color: C.soft }))
  const my = Y + 190 + A.length * 42 + 10
  let mx = CX + 70
  mx += text(ctx, 'Claude Sonnet 5.5 · 2.1s · shield · paid by proof ✓ · ', mx, my, { size: 15, family: MONO, color: C.dim })
  const sx = mx
  icon(ctx, LINK_ICON, sx + 8, my - 5, 14, t > K.share - 0.5 && t < K.share + 0.6 ? C.fg : C.dim, 2)
  text(ctx, 'share', sx + 22, my, { size: 15, family: MONO, color: t > K.share - 0.5 && t < K.share + 0.6 ? C.fg : C.dim })

  // pointer: share, create, copy
  const MX = 960 - 330
  const MY = Y + 300
  const createAt = { x: 960, y: MY + 330 }
  const copyAt = { x: MX + 660 - 80, y: MY + 330 }
  const shareAt = { x: sx + 30, y: my - 5 }
  let px = 0
  let py = 0
  let pa = 0
  if (t < K.share + 0.3) {
    const e = easeInOut(prog(t, K.share - 1.0, K.share - 0.1))
    px = 1100 + (shareAt.x - 1100) * e
    py = Y + 700 + (shareAt.y - Y - 700) * e
    pa = win(t, K.share - 1.1, K.share + 0.3, 0.2, 0.2)
  } else if (t < K.create + 0.3) {
    const e = easeInOut(prog(t, K.dialog + 0.6, K.create - 0.1))
    px = shareAt.x + (createAt.x - shareAt.x) * e
    py = shareAt.y + (createAt.y - shareAt.y) * e
    pa = win(t, K.dialog + 0.4, K.create + 0.3, 0.2, 0.2)
  } else {
    const e = easeInOut(prog(t, K.create + 0.5, K.copy - 0.1))
    px = createAt.x + (copyAt.x - createAt.x) * e
    py = createAt.y + (copyAt.y - createAt.y) * e
    pa = win(t, K.create + 0.4, K.copy + 0.5, 0.2, 0.3)
  }

  // the dialog
  const d = easeOut(prog(t, K.dialog, K.dialog + 0.3))
  if (d > 0) {
    ctx.fillStyle = `rgba(3,3,4,${0.72 * d})`
    ctx.fillRect(X, Y, 1680, 900)
    ctx.save()
    ctx.globalAlpha *= d
    const my2 = MY + (1 - d) * 16
    panel(ctx, MX, my2, 660, 420, 16, C.panel, C.line2)
    text(ctx, 'PRIVACY · SHARE', MX + 32, my2 + 44, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, 'Share this answer', MX + 32, my2 + 78, { size: 24, weight: 500 })
    text(ctx, 'The question and answer go inside the link, after the “#”.', MX + 32, my2 + 122, { size: 17, color: C.muted })
    text(ctx, 'Browsers never send that part to a server.', MX + 32, my2 + 148, { size: 17, color: C.muted })
    // checkboxes
    ctx.fillStyle = C.ok
    ctx.beginPath()
    ctx.roundRect(MX + 32, my2 + 178, 18, 18, 3)
    ctx.fill()
    check(ctx, MX + 41, my2 + 187, 11, C.bg, 2.4)
    tagged(ctx, 'Keep personal details out: share it with [NAME_1]', MX + 62, my2 + 193, 17, C.soft)
    ctx.strokeStyle = C.line3
    ctx.lineWidth = 1.5
    ctx.strokeRect(MX + 32, my2 + 218, 18, 18)
    text(ctx, 'Lock it with a passphrase', MX + 62, my2 + 233, { size: 17, color: C.soft })
    // create → link
    if (t < K.link) {
      ctx.beginPath()
      ctx.roundRect(MX + 32, my2 + 306, 596, 46, 7)
      ctx.fillStyle = C.fg
      ctx.fill()
      icon(ctx, LINK_ICON, 960 - 66, my2 + 329, 15, C.bg, 2)
      text(ctx, 'CREATE LINK', 960 + 10, my2 + 334, { size: 13, family: MONO, color: C.bg, align: 'center', spacing: '0.1em' })
    } else {
      const la = easeOut(prog(t, K.link, K.link + 0.3))
      ctx.save()
      ctx.globalAlpha *= la
      panel(ctx, MX + 32, my2 + 304, 596, 52, 8, `rgba(${OK_RGB},0.04)`, `rgba(${OK_RGB},0.35)`)
      text(ctx, LINK.slice(0, 44) + '…', MX + 48, my2 + 336, { size: 15, family: MONO, color: C.soft })
      const copied = t >= K.copy
      panel(ctx, MX + 660 - 130, my2 + 312, 92, 36, 6, C.panel, C.line2)
      text(ctx, copied ? '✓ COPIED' : 'COPY', MX + 660 - 84, my2 + 335, { size: 12, family: MONO, color: copied ? C.ok : C.fg, align: 'center', spacing: '0.08em' })
      text(ctx, '396 characters · anyone with the link can read it', MX + 32, my2 + 386, { size: 13, family: MONO, color: C.dim })
      ctx.restore()
    }
    ctx.restore()
  }
  pointer(ctx, px, py, pa)
  ripple(ctx, shareAt.x - 8, shareAt.y, t, K.share)
  ripple(ctx, createAt.x, createAt.y, t, K.create)
  ripple(ctx, copyAt.x, copyAt.y, t, K.copy)
  ctx.restore()
}

/** the link, split into what the server gets and what stays in the browser */
function split(ctx: CanvasRenderingContext2D, t: number) {
  const K = SHARE_CUES
  const a = win(t, K.split[0], K.split[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHY WE NEVER SEE IT', 960, 200, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Browsers don’t send the part after “#”.', 960, 268, { size: 52, weight: 500, align: 'center', spacing: '-1.5px' })
  const y = 440
  const left = 'nullzk.com/s'
  const lw = measure(ctx, left, { size: 40, family: MONO })
  const hw = measure(ctx, HASH_SHORT, { size: 40, family: MONO })
  const x0 = 960 - (lw + 40 + hw) / 2
  const sep = easeOut(prog(t, K.split[0] + 0.6, K.split[0] + 1.3)) * 40
  text(ctx, left, x0, y, { size: 40, family: MONO, color: C.soft })
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 + lw + sep - 4, y - 50, 1920, 80)
  ctx.clip()
  text(ctx, HASH_SHORT, x0 + lw + sep, y, { size: 40, family: MONO, color: C.ok })
  ctx.restore()
  const la = easeOut(prog(t, K.split[0] + 1.2, K.split[0] + 1.7))
  ctx.save()
  ctx.globalAlpha *= la
  ctx.fillStyle = C.line3
  ctx.fillRect(x0, y + 22, lw, 2)
  ctx.fillStyle = `rgba(${OK_RGB},0.6)`
  ctx.fillRect(x0 + lw + sep, y + 22, hw, 2)
  text(ctx, 'what the server gets', x0, y + 64, { size: 20, family: MONO, color: C.muted })
  text(ctx, 'stays in the browser: the whole answer, compressed', x0 + lw + sep, y + 64, { size: 20, family: MONO, color: C.ok })
  ctx.restore()
  // the request that actually goes out
  const ra = easeOut(prog(t, K.request, K.request + 0.4))
  if (ra > 0) {
    ctx.save()
    ctx.globalAlpha *= ra
    panel(ctx, 560, 600, 800, 220, 16, C.panel, C.line2)
    text(ctx, 'THE REQUEST THAT REACHES NULLZK.COM', 600, 646, { size: 14, family: MONO, color: C.dim, spacing: '0.14em' })
    const n = Math.floor(prog(t, K.request + 0.3, K.request + 1.0) * 'GET /s HTTP/2'.length)
    text(ctx, 'GET /s HTTP/2'.slice(0, n), 600, 706, { size: 34, family: MONO, color: C.fg })
    text(ctx, 'host: nullzk.com', 600, 752, { size: 22, family: MONO, color: C.muted })
    const fa = easeOut(prog(t, K.request + 1.4, K.request + 1.9))
    check(ctx, 612, 789, 14, C.ok, 2.4)
    text(ctx, 'no question, no answer, no names', 634, 796, { size: 18, family: MONO, color: C.ok, alpha: fa })
    ctx.restore()
  }
  ctx.restore()
}

/** what the reader sees */
function reader(ctx: CanvasRenderingContext2D, t: number) {
  const K = SHARE_CUES
  const a = win(t, K.reader[0], K.reader[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHAT YOUR FRIEND SEES', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  const X = 360
  const Y = 190 - (1 - easeOut(prog(t, K.reader[0], K.reader[0] + 0.6))) * 20
  panel(ctx, X, Y, 1200, 760, 20, C.panel, C.line2)
  nullMark(ctx, X + 40, Y + 40, 10, 1, 1, 2.6)
  text(ctx, 'NULL', X + 60, Y + 46, { size: 16, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'SHARED', X + 124, Y + 46, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, 'ASK YOUR OWN ›', X + 1170, Y + 46, { size: 13, family: MONO, color: C.soft, align: 'right', spacing: '0.12em' })
  panel(ctx, X + 40, Y + 84, 1120, 54, 10, `rgba(${OK_RGB},0.04)`, `rgba(${OK_RGB},0.3)`)
  text(ctx, 'This answer came inside the link and was unpacked in your browser. It was never uploaded.', X + 64, Y + 117, { size: 17, color: C.ok })
  const qw = measure(ctx, Q_SHARED, { size: 19 }) + 60
  ctx.beginPath()
  ctx.roundRect(X + 1160 - qw, Y + 168, qw, 48, 18)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fill()
  ctx.strokeStyle = C.line2
  ctx.stroke()
  tagged(ctx, Q_SHARED, X + 1160 - qw + 22, Y + 199, 19, C.fg)
  panel(ctx, X + 40, Y + 252, 40, 40, 8, C.panel, C.line2)
  nullMark(ctx, X + 60, Y + 272, 8, 1, 1, 2.5)
  A_SHARED.forEach((l, i) => tagged(ctx, l, X + 110, Y + 278 + i * 44, 23, C.soft))
  text(ctx, 'Claude Sonnet 5.5 · Oct 14, 2026 · shared with placeholders, no personal details', X + 110, Y + 278 + A_SHARED.length * 44 + 8, { size: 14, family: MONO, color: C.ok })
  panel(ctx, X + 40, Y + 570, 1120, 140, 14, 'rgba(255,255,255,0.02)', C.line2)
  text(ctx, 'Ask your own question, privately.', X + 600, Y + 622, { size: 22, color: C.fg, align: 'center' })
  text(ctx, 'No account. Paid with a zero-knowledge proof.', X + 600, Y + 656, { size: 17, color: C.muted, align: 'center' })
  text(ctx, 'OPEN NULL CHAT ↗', X + 600, Y + 690, { size: 14, family: MONO, color: C.ok, align: 'center', spacing: '0.1em' })
  ctx.restore()
}

const POINTS = [
  { k: 'NAMES STAY OUT', v: 'shared as [NAME_1]' },
  { k: 'OPTIONAL LOCK', v: 'passphrase, sent another way' },
  { k: 'NO UPLOAD', v: 'no copy on our side' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const K = SHARE_CUES
  const a = win(t, 21.5, K.end, 0.4, 0.45)
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
    tagged(ctx, p.v, x + 36, 566, 30, C.fg)
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = SHARE_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  icon(ctx, LINK_ICON, 960, 320, 120, C.fg, 2)
  text(ctx, 'Share answers, not data.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private Share Links, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawShare(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  split(ctx, t)
  reader(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

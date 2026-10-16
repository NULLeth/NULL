// "Paranoid mode": ~28 s promo. Title → the switch in NULL Chat, its five rules, the Tor check,
// a message with a name typed, sent, held back by the random delay, answered → the two guards
// (no Tor, nothing sent; on Tor, OpenRouter sees an exit relay) → three points with the honest
// limit → end card. The message, the hidden name and the countdown match the test in NULL Chat.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const PARANOID_DURATION = 28

export const PARANOID_CUES = {
  click: 4.3,
  rules: [4.7, 5.0, 5.3, 5.6, 5.9],
  torCheck: 6.3,
  torOk: 6.9,
  typeStart: 7.3,
  typeEnd: 9.5,
  send: 10.0,
  delay: [10.3, 14.5],
  answer: 14.6,
  guard: [16.4, 21.0],
  blocked: 16.9,
  route: 18.4,
  points: [21.6, 22.0, 22.4],
  honest: 23.2,
  end: 25.6,
}

const WARN_RGB = '224,180,94'
const OK_RGB = '67,211,146'
const BAD_RGB = '239,107,107'
const SHIELD = new Path2D(
  'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M12 8v4 M12 16h.01',
)

const Q = 'Write a short note to my doctor Anna Keller about my results from Monday.'
const RULES = [
  'Tor only: checked before every message',
  'Nothing saved, not even in this browser',
  'AI Shield always on: names become placeholders',
  'A random 2–8 s delay before the request leaves',
  'Memory, web search, images and files off',
]
const ANSWER = ['Hi Anna Keller,', 'Could we go over my results from Monday?', 'Any time this week works for me. Thank you!']

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

function ripple(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, at: number, rgb: string) {
  const r = prog(t, at, at + 0.45)
  if (r <= 0 || r >= 1) return
  ctx.beginPath()
  ctx.arc(x, y, 8 + r * 26, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${rgb},${0.6 * (1 - r)})`
  ctx.lineWidth = 2
  ctx.stroke()
}

function dashedPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, rgb: string, fillA: number) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = `rgba(${rgb},${fillA})`
  ctx.fill()
  ctx.setLineDash([7, 6])
  ctx.strokeStyle = `rgba(${rgb},0.5)`
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.4, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, WARN_RGB, 0.07)
  icon(ctx, SHIELD, 960, 410, 140 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Paranoid Mode', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'One switch. The strictest NULL there is.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = PARANOID_CUES
  const a = win(t, 3.1, K.guard[0] + 0.2, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 120
  const Y = 90 + (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  const W = 1680
  panel(ctx, X, Y, W, 900, 22, C.panel, C.line2)
  const on = t >= K.click

  // header
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X, Y + 80)
  ctx.lineTo(X + W, Y + 80)
  ctx.stroke()
  nullMark(ctx, X + 44, Y + 40, 11, 1, 1, 3)
  text(ctx, 'NULL', X + 66, Y + 47, { size: 18, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', X + 140, Y + 47, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
  panel(ctx, X + 240, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, 'Claude Sonnet 5.5', X + 258, Y + 46, { size: 17, color: C.soft })
  const torShown = t >= K.torOk
  if (torShown) {
    ctx.save()
    ctx.globalAlpha *= easeOut(prog(t, K.torOk, K.torOk + 0.3))
    panel(ctx, X + 506, Y + 22, 84, 36, 18, C.panel, `rgba(${OK_RGB},0.4)`)
    ctx.beginPath()
    ctx.arc(X + 526, Y + 40, 4, 0, Math.PI * 2)
    ctx.fillStyle = C.ok
    ctx.fill()
    text(ctx, 'TOR', X + 538, Y + 45, { size: 14, family: MONO, color: C.ok, spacing: '0.12em' })
    ctx.restore()
  }
  // the paranoid switch
  const BX = X + W - 470
  const BW = on ? 236 : 150
  if (on) dashedPanel(ctx, BX, Y + 20, BW, 40, 20, WARN_RGB, 0.1)
  else panel(ctx, BX, Y + 20, BW, 40, 20, C.panel, C.line2)
  icon(ctx, SHIELD, BX + 24, Y + 40, 17, on ? C.warn : C.dim, 2)
  text(ctx, on ? 'PARANOID · LEAVE' : 'PARANOID', BX + 40, Y + 46, { size: 14, family: MONO, color: on ? C.warn : C.dim, spacing: '0.12em' })
  panel(ctx, X + W - 220, Y + 22, 70, 36, 18, C.panel, `rgba(${OK_RGB},0.35)`)
  text(ctx, 'LIVE', X + W - 185, Y + 45, { size: 13, family: MONO, color: C.ok, align: 'center', spacing: '0.12em' })
  panel(ctx, X + W - 136, Y + 20, 108, 40, 8, C.fg, C.fg)
  text(ctx, 'WALLET', X + W - 82, Y + 45, { size: 13, family: MONO, color: C.bg, align: 'center', spacing: '0.1em' })

  const CX = X + 260
  const CW = 1160
  // before the click: an ordinary empty chat
  const plain = 1 - easeOut(prog(t, K.click, K.click + 0.3))
  if (plain > 0) {
    text(ctx, 'Ask privately.', X + W / 2, Y + 400, { size: 46, weight: 500, align: 'center', spacing: '-1.5px', alpha: plain })
    text(ctx, 'Each chat is paid with a zero-knowledge proof.', X + W / 2, Y + 450, { size: 19, color: C.muted, align: 'center', alpha: plain })
  }
  // the rules box, until the message goes out
  const box = easeOut(prog(t, K.click + 0.1, K.click + 0.5)) * (1 - easeOut(prog(t, K.send, K.send + 0.35)))
  if (box > 0) {
    ctx.save()
    ctx.globalAlpha *= box
    const RX = X + W / 2 - 400
    const RY = Y + 150
    dashedPanel(ctx, RX, RY, 800, 410, 16, WARN_RGB, 0.04)
    icon(ctx, SHIELD, X + W / 2 - 96, RY + 46, 18, C.warn, 2)
    text(ctx, 'PARANOID MODE', X + W / 2 + 12, RY + 52, { size: 16, family: MONO, color: C.warn, align: 'center', spacing: '0.16em' })
    RULES.forEach((r, i) => {
      const ra = easeOut(prog(t, K.rules[i], K.rules[i] + 0.3))
      if (!ra) return
      ctx.save()
      ctx.globalAlpha *= ra
      check(ctx, RX + 52, RY + 112 + i * 56, 16, C.ok, 2.6)
      text(ctx, r, RX + 80, RY + 120 + i * 56, { size: 22, color: C.soft })
      ctx.restore()
    })
    text(ctx, 'Not a mixnet: Tor hides your IP, not every timing pattern.', X + W / 2, RY + 388, { size: 15, family: MONO, color: C.dim, align: 'center', alpha: easeOut(prog(t, 6.2, 6.6)) })
    ctx.restore()
  }

  // after sending: the message, the delay, the answer
  const sent = easeOut(prog(t, K.send + 0.1, K.send + 0.5))
  if (sent > 0) {
    ctx.save()
    ctx.globalAlpha *= sent
    const qw = measure(ctx, Q, { size: 20 }) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 130, qw, 50, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, Q, CX + CW - qw + 22, Y + 162, { size: 20, color: C.fg })
    check(ctx, CX + CW - 222, Y + 205, 11, C.ok, 2)
    text(ctx, '1 hidden from the AI', CX + CW, Y + 210, { size: 14, family: MONO, color: C.ok, align: 'right' })
    panel(ctx, CX, Y + 250, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, Y + 270, 8, 1, 1, 2.5)
    if (t < K.answer) {
      const left = Math.max(1, Math.ceil(K.delay[1] - Math.max(t, K.delay[0])))
      const spin = t * 5
      ctx.save()
      ctx.strokeStyle = C.warn
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.arc(CX + 82, Y + 270, 9, spin, spin + 4.2)
      ctx.stroke()
      ctx.restore()
      text(ctx, `Random delay · sending in ${left}s`, CX + 104, Y + 277, { size: 19, family: MONO, color: C.warn })
      // the delay bar
      const p = prog(t, K.delay[0], K.delay[1])
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(CX + 70, Y + 300, 420, 4)
      ctx.fillStyle = C.warn
      ctx.fillRect(CX + 70, Y + 300, 420 * p, 4)
    } else {
      ANSWER.forEach((l, i) => {
        const la = easeOut(prog(t, K.answer + i * 0.25, K.answer + 0.3 + i * 0.25))
        text(ctx, l, CX + 70, Y + 278 + i * 44, { size: 23, color: C.soft, alpha: la })
      })
      const ma = easeOut(prog(t, K.answer + 0.8, K.answer + 1.2))
      ctx.save()
      ctx.globalAlpha *= ma
      let mx = CX + 70
      const my = Y + 278 + ANSWER.length * 44 + 8
      mx += text(ctx, 'Claude Sonnet 5.5 · ', mx, my, { size: 15, family: MONO, color: C.dim })
      mx += text(ctx, 'delayed 4.2s', mx, my, { size: 15, family: MONO, color: C.warn })
      text(ctx, ' · shield · paid by proof ✓', mx, my, { size: 15, family: MONO, color: C.dim })
      ctx.restore()
    }
    ctx.restore()
  }

  // composer: the paranoid bar, the shield line while typing, the input
  const PY = Y + 690
  const ba = easeOut(prog(t, K.click + 0.2, K.click + 0.6))
  if (ba > 0) {
    ctx.save()
    ctx.globalAlpha *= ba
    dashedPanel(ctx, CX, PY, CW, 46, 10, WARN_RGB, 0.03)
    icon(ctx, SHIELD, CX + 22, PY + 23, 16, C.warn, 2)
    let x = CX + 38
    x += text(ctx, 'PARANOID', x, PY + 29, { size: 14, family: MONO, color: C.warn, spacing: '0.12em' }) + 22
    const torState = t < K.torCheck ? '' : t < K.torOk ? '… checking Tor' : '✓ Tor'
    if (torState) x += text(ctx, torState, x, PY + 29, { size: 14, family: MONO, color: t < K.torOk ? C.dim : C.ok }) + 20
    for (const item of ['✓ nothing saved', '✓ AI Shield', '✓ random delay 2–8 s', '✓ memory, web, files off']) x += text(ctx, item, x, PY + 29, { size: 14, family: MONO, color: C.ok }) + 20
    ctx.restore()
  }
  const typed = t >= K.send ? '' : Q.slice(0, Math.floor(prog(t, K.typeStart, K.typeEnd) * Q.length))
  if (typed.includes('Anna Keller') && t < K.send) {
    ctx.save()
    ctx.globalAlpha *= easeOut(prog(t, K.typeStart + 1.4, K.typeStart + 1.7))
    check(ctx, CX + 10, PY + 74, 11, C.ok, 2)
    let x = CX + 24
    x += text(ctx, 'SHIELD', x, PY + 79, { size: 13, family: MONO, color: C.ok, spacing: '0.12em' }) + 14
    x += text(ctx, '1 of 1 hidden from the AI', x, PY + 79, { size: 13, family: MONO, color: C.dim }) + 14
    const chip = 'AI · name · Anna Keller'
    const w = measure(ctx, chip, { size: 13, family: MONO }) + 18
    ctx.fillStyle = `rgba(${OK_RGB},0.08)`
    ctx.strokeStyle = `rgba(${OK_RGB},0.35)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.roundRect(x, PY + 62, w, 24, 6)
    ctx.fill()
    ctx.stroke()
    text(ctx, chip, x + 9, PY + 79, { size: 13, family: MONO, color: C.ok })
    ctx.restore()
  }
  const IY = PY + 100
  panel(ctx, CX, IY, CW, 70, 14, C.panel2, C.line3)
  if (typed) text(ctx, typed, CX + 24, IY + 43, { size: 20, color: C.fg })
  else text(ctx, 'Ask privately…', CX + 24, IY + 43, { size: 20, color: C.dim })
  if (t > K.typeStart && t < K.send && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.warn
    ctx.fillRect(CX + 26 + (typed ? measure(ctx, typed, { size: 20 }) : 0), IY + 24, 2, 26)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 60, IY + 14, 42, 42, 9)
  ctx.fillStyle = C.fg
  ctx.fill()
  ctx.strokeStyle = C.bg
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(CX + CW - 39, IY + 46)
  ctx.lineTo(CX + CW - 39, IY + 25)
  ctx.moveTo(CX + CW - 47, IY + 33)
  ctx.lineTo(CX + CW - 39, IY + 25)
  ctx.lineTo(CX + CW - 31, IY + 33)
  ctx.stroke()

  // pointer: the switch, then send
  const sw = { x: BX + 80, y: Y + 40 }
  const sd = { x: CX + CW - 39, y: IY + 35 }
  if (t < K.click + 0.4) {
    const e = easeInOut(prog(t, K.click - 0.9, K.click - 0.1))
    pointer(ctx, 900 + (sw.x - 900) * e, 600 + (sw.y - 600) * e, win(t, K.click - 1.0, K.click + 0.4, 0.2, 0.25))
  } else {
    const e = easeInOut(prog(t, K.send - 0.9, K.send - 0.1))
    pointer(ctx, 1100 + (sd.x - 1100) * e, 640 + (sd.y - 640) * e, win(t, K.send - 1.0, K.send + 0.4, 0.2, 0.25))
  }
  ripple(ctx, sw.x, sw.y, t, K.click, WARN_RGB)
  ripple(ctx, sd.x, sd.y, t, K.send, WARN_RGB)
  ctx.restore()
}

/** the two guards: no Tor, nothing sent; on Tor, the provider sees an exit relay */
function guard(ctx: CanvasRenderingContext2D, t: number) {
  const K = PARANOID_CUES
  const a = win(t, K.guard[0], K.guard[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'TOR ONLY, CHECKED EVERY TIME', 960, 170, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'No Tor, no request.', 960, 238, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })

  // left: not on Tor
  const la = easeOut(prog(t, K.blocked, K.blocked + 0.5))
  ctx.save()
  ctx.globalAlpha *= la
  panel(ctx, 160, 320, 760, 520, 18, `rgba(${BAD_RGB},0.03)`, `rgba(${BAD_RGB},0.35)`)
  text(ctx, 'NOT ON TOR', 200, 372, { size: 16, family: MONO, color: C.bad, spacing: '0.16em' })
  panel(ctx, 200, 410, 680, 64, 12, C.panel2, C.line3)
  text(ctx, 'Write a short note to my doctor…', 224, 450, { size: 20, color: C.fg })
  dashedPanel(ctx, 200, 500, 680, 46, 10, WARN_RGB, 0.03)
  icon(ctx, SHIELD, 222, 523, 16, C.warn, 2)
  text(ctx, 'PARANOID', 240, 529, { size: 14, family: MONO, color: C.warn, spacing: '0.12em' })
  text(ctx, '✗ not on Tor · how to', 352, 529, { size: 14, family: MONO, color: C.bad })
  text(ctx, 'You’re not on Tor, so nothing was sent.', 200, 610, { size: 24, color: C.warn })
  text(ctx, 'Your message stays in the box. Open NULL', 200, 670, { size: 21, color: C.muted })
  text(ctx, 'in Tor Browser and send it from there.', 200, 704, { size: 21, color: C.muted })
  ctx.restore()

  // right: on Tor
  const ra = easeOut(prog(t, K.route, K.route + 0.5))
  ctx.save()
  ctx.globalAlpha *= ra
  panel(ctx, 1000, 320, 760, 520, 18, `rgba(${OK_RGB},0.03)`, `rgba(${OK_RGB},0.35)`)
  text(ctx, 'ON TOR', 1040, 372, { size: 16, family: MONO, color: C.ok, spacing: '0.16em' })
  const nodes = [
    { y: 440, label: 'Your browser', sub: 'names → placeholders, then a random wait' },
    { y: 560, label: 'Tor · 3 relays', sub: 'your IP stays behind' },
    { y: 680, label: 'OpenRouter → model', sub: 'sees a Tor exit and a key paid by proof' },
  ]
  nodes.forEach((n, i) => {
    const na = easeOut(prog(t, K.route + 0.3 + i * 0.35, K.route + 0.6 + i * 0.35))
    ctx.save()
    ctx.globalAlpha *= na
    ctx.beginPath()
    ctx.arc(1070, n.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = i === 1 ? C.ok : C.panel2
    ctx.fill()
    ctx.strokeStyle = C.ok
    ctx.lineWidth = 2
    ctx.stroke()
    text(ctx, n.label, 1100, n.y + 7, { size: 24, color: C.fg })
    text(ctx, n.sub, 1100, n.y + 40, { size: 16, family: MONO, color: C.muted })
    if (i < nodes.length - 1) {
      const p = easeOut(prog(t, K.route + 0.5 + i * 0.35, K.route + 0.85 + i * 0.35))
      ctx.fillStyle = `rgba(${OK_RGB},0.6)`
      ctx.fillRect(1069, n.y + 14, 2, (120 - 28) * p)
    }
    ctx.restore()
  })
  text(ctx, 'Not you.', 1040, 800, { size: 24, color: C.ok, alpha: easeOut(prog(t, K.route + 1.6, K.route + 2.0)) })
  ctx.restore()
  ctx.restore()
}

const POINTS = [
  { k: 'TOR ONLY', v: 'checked before every message' },
  { k: 'NOTHING SAVED', v: 'gone when you leave' },
  { k: 'RANDOM DELAY', v: '2 to 8 s before it leaves' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const K = PARANOID_CUES
  const a = win(t, 21.2, K.end, 0.4, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, K.points[i] - 0.3, K.points[i] + 0.1))
    if (!pa) return
    const x = 120 + i * 570
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, 360 - (1 - pa) * 14, 540, 220, 18, C.panel, `rgba(${WARN_RGB},0.35)`)
    text(ctx, p.k, x + 36, 426, { size: 16, family: MONO, color: C.warn, spacing: '0.16em' })
    text(ctx, p.v, x + 36, 506, { size: 30, color: C.fg })
    ctx.restore()
  })
  text(ctx, 'Honest limit: not a mixnet. Tor hides your IP, not every timing pattern,', 960, 690, { size: 22, family: MONO, color: C.muted, align: 'center', alpha: easeOut(prog(t, K.honest, K.honest + 0.4)) })
  text(ctx, 'and the model still reads the shielded text.', 960, 728, { size: 22, family: MONO, color: C.muted, align: 'center', alpha: easeOut(prog(t, K.honest, K.honest + 0.4)) })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = PARANOID_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, WARN_RGB, 0.06)
  icon(ctx, SHIELD, 960, 320, 120, C.fg, 2)
  text(ctx, 'One switch. Fewer traces.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Paranoid mode, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawParanoid(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  guard(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

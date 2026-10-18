// "Wallet Guard": ~27 s promo. Title → a seed phrase is pasted with the shield switched off,
// the guard catches it (12 words, real BIP-39 checksum) → sent, answered → what left the
// browser: "[SEED_1]" → a backup screenshot, its words covered → the key formats it knows, and
// what still goes through → end card. The phrase is the public BIP-39 test vector, not a wallet.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const GUARD_DURATION = 27

export const GUARD_CUES = {
  paste: 4.4,
  bar: 4.9,
  checksum: 5.6,
  send: 8.0,
  answer: 8.9,
  wire: [12.2, 16.7],
  stayed: 13.8,
  shot: [16.9, 21.4],
  cover: 18.2,
  keys: [21.6, 24.8],
  keyItems: [22.0, 22.3, 22.6, 22.9],
  pass: 23.5,
  end: 24.8,
}

const BAD_RGB = '239,107,107'
const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const KEY = new Path2D(
  'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z M16.5 7.5h.01',
)

const SEED = 'legal winner thank year wave sausage worth useful legal winner thank yellow'
const Q = `Is this wallet safe? ${SEED}`
const Q_WIRE = 'Is this wallet safe? [SEED_1]'
const ANSWER = [
  'I only see a placeholder: your browser kept the seed phrase.',
  'Please don’t share it with anyone, an AI included.',
  'If you pasted it anywhere else, move your funds to a new wallet.',
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

/** text where [SEED_n] is drawn as a red pill */
function tagged(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, mono = false) {
  let cx = x
  for (const part of s.split(/(\[[A-Z]+_\d+\])/)) {
    if (!part) continue
    if (/^\[[A-Z]+_\d+\]$/.test(part)) {
      const w = measure(ctx, part, { size, family: MONO })
      ctx.fillStyle = `rgba(${BAD_RGB},0.14)`
      ctx.beginPath()
      ctx.roundRect(cx - 3, y - size * 0.88, w + 6, size * 1.22, 5)
      ctx.fill()
      cx += text(ctx, part, cx, y, { size, family: MONO, color: C.bad })
    } else cx += text(ctx, part, cx, y, { size, color, ...(mono ? { family: MONO } : {}) })
  }
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, BAD_RGB, 0.07)
  icon(ctx, KEY, 960, 410, 130 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Wallet Guard', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Seed phrases and private keys never leave your browser.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = GUARD_CUES
  const a = win(t, 3.1, K.wire[0] + 0.2, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 120
  const Y = 90 + (1 - easeOut(prog(t, 3.1, 3.9))) * 30
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
  panel(ctx, X + 240, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, 'Claude Sonnet 5.5', X + 258, Y + 46, { size: 17, color: C.soft })

  const CX = X + 260
  const CW = 1160
  const sent = t >= K.send
  if (!sent) {
    text(ctx, 'Ask privately.', X + W / 2, Y + 330, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    text(ctx, 'Each chat is paid with a zero-knowledge proof.', X + W / 2, Y + 380, { size: 19, color: C.muted, align: 'center' })
  } else {
    const qa = easeOut(prog(t, K.send + 0.1, K.send + 0.5))
    ctx.save()
    ctx.globalAlpha *= qa
    const lines = ['Is this wallet safe? legal winner thank year wave sausage', 'worth useful legal winner thank yellow']
    const qw = Math.max(...lines.map((l) => measure(ctx, l, { size: 20 }))) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 120, qw, 80, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    lines.forEach((l, i) => text(ctx, l, CX + CW - qw + 22, Y + 152 + i * 30, { size: 20, color: C.fg }))
    check(ctx, CX + CW - 278, Y + 222, 11, C.ok, 2)
    text(ctx, '1 hidden from the AI · show what it saw', CX + CW, Y + 227, { size: 14, family: MONO, color: C.ok, align: 'right' })
    ctx.restore()
    if (t >= K.answer) {
      panel(ctx, CX, Y + 270, 40, 40, 8, C.panel, C.line2)
      nullMark(ctx, CX + 20, Y + 290, 8, 1, 1, 2.5)
      ANSWER.forEach((l, i) => text(ctx, l, CX + 70, Y + 298 + i * 44, { size: 23, color: C.soft, alpha: easeOut(prog(t, K.answer + i * 0.3, K.answer + 0.35 + i * 0.3)) }))
      text(ctx, 'Claude Sonnet 5.5 · 1.8s · paid by proof ✓ · what was sent', CX + 70, Y + 298 + ANSWER.length * 44 + 8, { size: 15, family: MONO, color: C.dim, alpha: easeOut(prog(t, K.answer + 1.0, K.answer + 1.4)) })
    }
  }

  // the guard bar
  const PY = Y + 600
  const ga = easeOut(prog(t, K.bar, K.bar + 0.35)) * (1 - easeOut(prog(t, K.send, K.send + 0.3)))
  if (ga > 0) {
    ctx.save()
    ctx.globalAlpha *= ga
    panel(ctx, CX, PY, CW, 132, 12, `rgba(${BAD_RGB},0.05)`, `rgba(${BAD_RGB},0.4)`)
    icon(ctx, KEY, CX + 26, PY + 32, 17, C.bad, 2)
    text(ctx, 'WALLET GUARD', CX + 44, PY + 38, { size: 15, family: MONO, color: C.bad, spacing: '0.12em' })
    let x = CX + 186
    const chip = (s: string, color: string) => {
      const w = measure(ctx, s, { size: 15, family: MONO }) + 20
      ctx.fillStyle = `rgba(${BAD_RGB},0.07)`
      ctx.strokeStyle = `rgba(${BAD_RGB},0.35)`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.roundRect(x, PY + 18, w, 30, 6)
      ctx.fill()
      ctx.stroke()
      text(ctx, s, x + 10, PY + 38, { size: 15, family: MONO, color })
      x += w + 8
    }
    chip('seed phrase · 12 words', C.bad)
    if (t >= K.checksum) chip('real BIP-39 checksum', C.soft)
    text(ctx, '→ goes out as [SEED_1]', x + 4, PY + 38, { size: 15, family: MONO, color: C.dim })
    text(ctx, 'This never leaves your browser, not even with the shield off. Anyone with a seed phrase or private key', CX + 26, PY + 82, { size: 16, family: MONO, color: C.soft })
    text(ctx, 'owns the wallet: if you pasted it anywhere else, move your funds to a new wallet.', CX + 26, PY + 108, { size: 16, family: MONO, color: C.soft })
    ctx.restore()
  }

  // composer: the shield is off on purpose
  const IY = Y + 760
  panel(ctx, CX, IY, CW, 76, 14, C.panel2, C.line3)
  panel(ctx, CX + 16, IY + 18, 118, 40, 9, C.panel, C.line2)
  text(ctx, 'SHIELD off', CX + 75, IY + 44, { size: 14, family: MONO, color: C.dim, align: 'center', spacing: '0.06em' })
  if (!sent) {
    if (t >= K.paste) {
      const shown = Q.length > 70 ? `${Q.slice(0, 69)}…` : Q
      text(ctx, shown, CX + 152, IY + 46, { size: 19, color: C.fg })
    } else text(ctx, 'Ask privately…', CX + 152, IY + 46, { size: 19, color: C.dim })
  } else text(ctx, 'Ask privately…', CX + 152, IY + 46, { size: 19, color: C.dim })
  // the callout: shield off, guard still on
  const ca = win(t, K.bar + 0.8, K.send, 0.4, 0.3)
  if (ca > 0) text(ctx, 'shield switched off · the guard is always on', CX + 16, IY + 104, { size: 15, family: MONO, color: C.warn, alpha: ca })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 60, IY + 17, 42, 42, 9)
  ctx.fillStyle = C.fg
  ctx.fill()
  ctx.strokeStyle = C.bg
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(CX + CW - 39, IY + 49)
  ctx.lineTo(CX + CW - 39, IY + 28)
  ctx.moveTo(CX + CW - 47, IY + 36)
  ctx.lineTo(CX + CW - 39, IY + 28)
  ctx.lineTo(CX + CW - 31, IY + 36)
  ctx.stroke()
  const sd = { x: CX + CW - 39, y: IY + 38 }
  const e = easeInOut(prog(t, K.send - 1.0, K.send - 0.1))
  pointer(ctx, 1000 + (sd.x - 1000) * e, 560 + (sd.y - 560) * e, win(t, K.send - 1.1, K.send + 0.4, 0.2, 0.25))
  const r = prog(t, K.send, K.send + 0.45)
  if (r > 0 && r < 1) {
    ctx.beginPath()
    ctx.arc(sd.x, sd.y, 8 + r * 26, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${BAD_RGB},${0.6 * (1 - r)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()
}

/** what left the browser */
function wire(ctx: CanvasRenderingContext2D, t: number) {
  const K = GUARD_CUES
  const a = win(t, K.wire[0], K.wire[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHAT LEFT YOUR BROWSER', 960, 190, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Twelve words became one placeholder.', 960, 258, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  panel(ctx, 160, 330, 1600, 200, 16, C.panel, `rgba(${ETH_RGB},0.3)`)
  text(ctx, 'OUTBOX · ANSWER REQUEST · "role": "user"', 200, 380, { size: 15, family: MONO, color: C.dim, spacing: '0.08em' })
  tagged(ctx, `"${Q_WIRE}"`, 200, 460, 40, C.fg, true)
  const sa = easeOut(prog(t, K.stayed, K.stayed + 0.5))
  ctx.save()
  ctx.globalAlpha *= sa
  panel(ctx, 160, 580, 1600, 230, 16, `rgba(${OK_RGB},0.03)`, `rgba(${OK_RGB},0.3)`)
  text(ctx, 'STAYED IN THIS BROWSER', 200, 630, { size: 15, family: MONO, color: C.ok, spacing: '0.14em' })
  const words = SEED.split(' ')
  words.forEach((w, i) => {
    const wa = easeOut(prog(t, K.stayed + 0.15 + i * 0.06, K.stayed + 0.4 + i * 0.06))
    const col = i % 6
    const row = Math.floor(i / 6)
    text(ctx, `${i + 1}. ${w}`, 200 + col * 255, 692 + row * 52, { size: 24, color: C.muted, alpha: wa })
  })
  check(ctx, 212, 784, 12, C.ok, 2.4)
  text(ctx, '12 words · real BIP-39 checksum · never sent', 232, 790, { size: 17, family: MONO, color: C.ok, alpha: easeOut(prog(t, K.stayed + 1.0, K.stayed + 1.4)) })
  ctx.restore()
  ctx.restore()
}

/** a backup screenshot: the words are covered before it goes anywhere */
function shot(ctx: CanvasRenderingContext2D, t: number) {
  const K = GUARD_CUES
  const a = win(t, K.shot[0], K.shot[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'SCREENSHOTS TOO', 960, 170, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Your backup photo goes out with the words covered.', 960, 238, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })
  const X = 460
  const Y = 300
  ctx.fillStyle = '#f4f4f2'
  ctx.beginPath()
  ctx.roundRect(X, Y, 1000, 600, 16)
  ctx.fill()
  text(ctx, 'Your Secret Recovery Phrase', X + 60, Y + 80, { size: 36, weight: 600, color: '#111' })
  const words = SEED.split(' ')
  words.forEach((w, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = X + 60 + col * 310
    const y = Y + 180 + row * 100
    text(ctx, `${i + 1}. ${w}`, x, y, { size: 32, color: '#111' })
    const c = easeOut(prog(t, K.cover + i * 0.07, K.cover + 0.25 + i * 0.07))
    if (c > 0) {
      const wd = measure(ctx, `${i + 1}. ${w}`, { size: 32 })
      ctx.fillStyle = `rgba(22,22,26,${c})`
      ctx.beginPath()
      ctx.roundRect(x - 8, y - 34, (wd + 16) * c, 46, 6)
      ctx.fill()
      if (c > 0.8) text(ctx, 'SEED PHRASE', x - 8 + (wd + 16) / 2, y - 4, { size: 15, family: MONO, color: '#9aa3ff', align: 'center', alpha: (c - 0.8) * 5 })
    }
  })
  const la = easeOut(prog(t, K.cover + 1.2, K.cover + 1.6))
  check(ctx, 812, 960, 13, C.ok, 2.4)
  text(ctx, 'read in your browser (OCR), covered in every version of the photo', 834, 966, { size: 18, family: MONO, color: C.ok, alpha: la })
  ctx.restore()
}

const KEYS = ['Ethereum private keys', 'Solana keys + keypair files', 'Bitcoin WIF keys', 'xprv / zprv keys']

function keys(ctx: CanvasRenderingContext2D, t: number) {
  const K = GUARD_CUES
  const a = win(t, K.keys[0], K.keys[1], 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'PRIVATE KEYS, TOO', 960, 250, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  KEYS.forEach((k, i) => {
    const ka = easeOut(prog(t, K.keyItems[i] - 0.2, K.keyItems[i] + 0.2))
    if (!ka) return
    const x = 120 + i * 425
    ctx.save()
    ctx.globalAlpha *= ka
    panel(ctx, x, 320 - (1 - ka) * 12, 400, 150, 16, C.panel, `rgba(${BAD_RGB},0.35)`)
    icon(ctx, KEY, x + 46, 395, 26, C.bad, 2)
    text(ctx, k, x + 76, 404, { size: 24, color: C.fg })
    ctx.restore()
  })
  const pa = easeOut(prog(t, K.pass, K.pass + 0.4))
  ctx.save()
  ctx.globalAlpha *= pa
  panel(ctx, 420, 560, 1080, 120, 16, `rgba(${OK_RGB},0.03)`, `rgba(${OK_RGB},0.3)`)
  check(ctx, 466, 620, 16, C.ok, 2.6)
  text(ctx, 'Tx hashes and signatures aren’t mistaken for keys.', 496, 629, { size: 26, color: C.fg })
  ctx.restore()
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = GUARD_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, BAD_RGB, 0.06)
  icon(ctx, KEY, 960, 320, 110, C.fg, 2)
  text(ctx, 'Your keys stay yours.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Wallet Guard, live in NULL Chat. Always on.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawGuard(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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
  shot(ctx, t)
  keys(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

// "Sign Check": ~27 s promo. Title → a wallet asks for a signature (a Permit, unreadable) →
// copied into NULL Chat, decoded in the browser: unlimited USDC for an unknown address, no expiry
// → three more requests it reads (approve, setApprovalForAll, a Seaport listing that pays
// nothing) → the honest limit → end card. The requests are made up for the film; the texts are
// what Sign Check prints for them. The site is a reserved .example domain, not a real one.

import { PROJECT } from '../src/config/project'
import { C, MONO, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const SIGN_DURATION = 27

export const SIGN_CUES = {
  wallet: [3.5, 8.6],
  copy: 7.0,
  chat: [8.4, 15.6],
  paste: 9.4,
  bar: 10.0,
  lines: [10.6, 11.4, 12.0],
  cases: [15.4, 21.4],
  caseItems: [16.0, 17.4, 18.8],
  honest: [21.2, 24.4],
  end: 24.6,
}

const BAD_RGB = '239,107,107'
const OK_RGB = '67,211,146'
const SIGN = new Path2D(
  'M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z M14.487 7.858A1 1 0 0 1 14 7V2 M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516 M8 18h1',
)

const RAW = [
  'primaryType: "Permit"',
  'domain: { name: "USD Coin", verifyingContract: 0xA0b8…eB48 }',
  'spender: 0x9f2a51c0de3b7e8a1d4c6f0b2e5a7d9c1b3e5f70',
  'value: 115792089237316195423570985008687907853269984665640564039457584007913129639935',
  'deadline: 99999999999',
]
const DECODED = [
  'A signature, not a transaction: no gas, nothing shows in your wallet history. But it lets',
  'unknown address 0x9f2a…5f70 spend UNLIMITED USDC, until never (no real expiry).',
]
const CASES = [
  { kind: 'transaction · approve(address,uint256)', line: 'Lets unknown address 0x9f2a…5f70 spend UNLIMITED USDC from your wallet.' },
  { kind: 'transaction · setApprovalForAll(address,bool)', line: 'Lets unknown address 0x9f2a…5f70 move ALL your NFTs in this collection.' },
  { kind: 'signature · Seaport listing', line: 'You give: NFT #8817. You get: NOTHING.' },
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

function risky(ctx: CanvasRenderingContext2D, x: number, y: number, size = 13) {
  ctx.fillStyle = `rgba(${BAD_RGB},0.12)`
  ctx.strokeStyle = `rgba(${BAD_RGB},0.5)`
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(x, y - size - 4, size * 4.6, size + 12, 5)
  ctx.fill()
  ctx.stroke()
  text(ctx, 'RISKY', x + 9, y + 2, { size, family: MONO, color: C.bad, spacing: '0.12em' })
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.4, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, BAD_RGB, 0.06)
  icon(ctx, SIGN, 960, 410, 130 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Sign Check', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Know what you sign. Decoded in your browser.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

/** a wallet's signature request: hard to read */
function wallet(ctx: CanvasRenderingContext2D, t: number) {
  const K = SIGN_CUES
  const a = win(t, K.wallet[0], K.wallet[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'A SITE ASKS YOU TO SIGN', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Would you know what this does?', 960, 218, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  const X = 460
  const Y = 270 + (1 - easeOut(prog(t, K.wallet[0], K.wallet[0] + 0.6))) * 20
  panel(ctx, X, Y, 1000, 640, 22, '#101015', C.line3)
  text(ctx, 'Signature request', X + 50, Y + 70, { size: 32, weight: 600 })
  text(ctx, 'rewards-claim.example', X + 50, Y + 112, { size: 20, family: MONO, color: C.muted })
  ctx.fillStyle = C.line
  ctx.fillRect(X + 50, Y + 140, 900, 1.5)
  RAW.forEach((l, i) => {
    const shown = l.length > 64 ? `${l.slice(0, 63)}…` : l
    text(ctx, shown, X + 50, Y + 196 + i * 52, { size: 21, family: MONO, color: C.soft })
  })
  // buttons
  panel(ctx, X + 50, Y + 530, 430, 66, 33, '#16161b', C.line3)
  text(ctx, 'Cancel', X + 265, Y + 571, { size: 22, color: C.soft, align: 'center' })
  ctx.fillStyle = '#5b6cff'
  ctx.beginPath()
  ctx.roundRect(X + 520, Y + 530, 430, 66, 33)
  ctx.fill()
  text(ctx, 'Sign', X + 735, Y + 571, { size: 22, weight: 600, color: '#fff', align: 'center' })
  // copy
  const sel = easeOut(prog(t, K.copy - 0.6, K.copy - 0.1))
  if (sel > 0) {
    ctx.fillStyle = `rgba(138,152,255,${0.16 * sel})`
    ctx.fillRect(X + 44, Y + 166, 912 * sel, 250)
  }
  const e = easeInOut(prog(t, K.copy - 1.6, K.copy - 0.8))
  pointer(ctx, 1500 + (X + 900 - 1500) * e, 900 + (Y + 400 - 900) * e, win(t, K.copy - 1.7, K.copy + 0.6, 0.2, 0.3))
  const ca = win(t, K.copy, K.wallet[1], 0.2, 0.3)
  if (ca > 0) {
    panel(ctx, X + 760, Y + 420, 180, 46, 10, C.panel, C.line3)
    text(ctx, 'copied ✓', X + 850, Y + 450, { size: 18, family: MONO, color: C.ok, align: 'center', alpha: ca })
  }
  ctx.restore()
}

function chat(ctx: CanvasRenderingContext2D, t: number) {
  const K = SIGN_CUES
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
  if (t < K.bar) {
    text(ctx, 'Ask privately.', X + W / 2, Y + 330, { size: 46, weight: 500, align: 'center', spacing: '-1.5px', alpha: 1 - easeOut(prog(t, K.paste, K.bar)) })
  }
  // the sign check bar
  const ba = easeOut(prog(t, K.bar, K.bar + 0.4))
  if (ba > 0) {
    ctx.save()
    ctx.globalAlpha *= ba
    const BY = Y + 170
    panel(ctx, CX, BY, CW, 470, 14, `rgba(${BAD_RGB},0.05)`, `rgba(${BAD_RGB},0.45)`)
    icon(ctx, SIGN, CX + 32, BY + 40, 20, C.bad, 2)
    text(ctx, 'SIGN CHECK', CX + 54, BY + 47, { size: 18, family: MONO, color: C.bad, spacing: '0.12em' })
    risky(ctx, CX + 32, BY + 104, 15)
    text(ctx, 'signature · Permit · USD Coin', CX + 120, BY + 104, { size: 19, family: MONO, color: C.soft })
    const l0 = easeOut(prog(t, K.lines[0], K.lines[0] + 0.4))
    DECODED.forEach((l, i) => text(ctx, l, CX + 32, BY + 164 + i * 40, { size: 24, color: C.fg, alpha: l0 }))
    text(ctx, 'Unlimited.', CX + 32, BY + 264, { size: 24, color: C.fg, alpha: easeOut(prog(t, K.lines[1], K.lines[1] + 0.4)) })
    text(ctx, 'The permission lasts a very long time.', CX + 32, BY + 306, { size: 24, color: C.fg, alpha: easeOut(prog(t, K.lines[2], K.lines[2] + 0.4)) })
    // highlight UNLIMITED USDC
    const hl = easeOut(prog(t, K.lines[1], K.lines[1] + 0.5))
    if (hl > 0) {
      ctx.strokeStyle = `rgba(${BAD_RGB},${0.8 * hl})`
      ctx.lineWidth = 2.5
      const pre = measure(ctx, 'unknown address 0x9f2a…5f70 spend ', { size: 24 })
      const hw = measure(ctx, 'UNLIMITED USDC', { size: 24 })
      ctx.beginPath()
      ctx.roundRect(CX + 32 + pre - 8, BY + 176, hw + 16, 40, 8)
      ctx.stroke()
    }
    text(ctx, 'decoded in your browser, nothing looked up online · it shows what this does, not whether the site asking is honest', CX + 32, BY + 420, { size: 15, family: MONO, color: C.dim })
    ctx.restore()
  }
  // composer with the pasted request
  const IY = Y + 760
  panel(ctx, CX, IY, CW, 76, 14, C.panel2, C.line3)
  const pasted = t >= K.paste
  text(ctx, pasted ? 'Is this safe to sign? { "primaryType": "Permit", "domain": { "name": "USD Coin", … } }' : 'Ask privately…', CX + 24, IY + 46, { size: 19, color: pasted ? C.fg : C.dim })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 60, IY + 17, 42, 42, 9)
  ctx.fillStyle = C.fg
  ctx.fill()
  ctx.restore()
}

function cases(ctx: CanvasRenderingContext2D, t: number) {
  const K = SIGN_CUES
  const a = win(t, K.cases[0], K.cases[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHAT IT READS', 960, 190, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'The tricks drainers use, in plain words.', 960, 258, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  CASES.forEach((c, i) => {
    const ca = easeOut(prog(t, K.caseItems[i] - 0.2, K.caseItems[i] + 0.3))
    if (!ca) return
    const y = 330 + i * 170
    ctx.save()
    ctx.globalAlpha *= ca
    panel(ctx, 260, y - (1 - ca) * 12, 1400, 140, 16, `rgba(${BAD_RGB},0.04)`, `rgba(${BAD_RGB},0.35)`)
    risky(ctx, 300, y + 50, 14)
    text(ctx, c.kind, 390, y + 50, { size: 18, family: MONO, color: C.muted })
    text(ctx, c.line, 300, y + 104, { size: 28, color: C.fg })
    ctx.restore()
  })
  ctx.restore()
}

function honest(ctx: CanvasRenderingContext2D, t: number) {
  const K = SIGN_CUES
  const a = win(t, K.honest[0], K.honest[1], 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const items = [
    { k: 'IN YOUR BROWSER', v: 'decoded before anything is sent' },
    { k: 'NOTHING LOOKED UP', v: 'no lookups that could link you' },
    { k: 'HONEST LIMIT', v: 'it reads the request, not the site' },
  ]
  items.forEach((p, i) => {
    const pa = easeOut(prog(t, K.honest[0] + 0.3 + i * 0.35, K.honest[0] + 0.7 + i * 0.35))
    if (!pa) return
    const x = 120 + i * 570
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, 420 - (1 - pa) * 14, 540, 220, 18, C.panel, `rgba(${OK_RGB},0.3)`)
    text(ctx, p.k, x + 36, 486, { size: 16, family: MONO, color: C.ok, spacing: '0.16em' })
    text(ctx, p.v, x + 36, 566, { size: 28, color: C.fg })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = SIGN_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, BAD_RGB, 0.05)
  icon(ctx, SIGN, 960, 320, 110, C.fg, 2)
  text(ctx, 'Know what you sign.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Sign Check, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawSignCheck(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  wallet(ctx, t)
  chat(ctx, t)
  cases(ctx, t)
  honest(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

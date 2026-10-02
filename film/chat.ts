// "NULL Chat is live": ~24 s promo. Title → a private conversation (proof steps, streamed
// answer, "paid by proof") → three points → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, vignette, win, wrap } from './kit'

export const CHAT_DURATION = 24

export const CHAT_CUES = {
  typeStart: 3.6,
  typeEnd: 5.4,
  send: 5.7,
  steps: [6.3, 6.9, 7.5],
  streamStart: 7.7,
  streamEnd: 11.6,
  points: [14.4, 15.4, 16.4],
  end: 19.2,
}

const PROMPT = 'Explain Ethereum blobs in simple terms.'
const ANSWER =
  'Think of every Ethereum block as a truck with two compartments. The regular one keeps its data forever, so space is expensive. Blobs are a second compartment for rollup data that nodes keep for about 18 days, which makes them far cheaper. That is why Layer 2 fees dropped.'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, '138,152,255', 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'NULL Chat', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Chat with AI. Nobody knows it’s you.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 13.9, 0.5, 0.45)
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
  if (t >= CHAT_CUES.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'Explain Ethereum blobs in…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Claude Sonnet 5.5 · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  }
  // balance
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 130, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  const bal = 0.05 - (t > CHAT_CUES.streamEnd ? 0.0000021 * easeOut(prog(t, CHAT_CUES.streamEnd, CHAT_CUES.streamEnd + 1)) : 0)
  text(ctx, bal.toFixed(6), X + 28, Y + H - 80, { size: 36, weight: 500, spacing: '-1px' })
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
  const keyOn = t >= CHAT_CUES.steps[1]
  ctx.beginPath()
  ctx.roundRect(M + 300, Y + 24, keyOn ? 252 : 186, 32, 16)
  ctx.strokeStyle = keyOn ? 'rgba(67,211,146,0.4)' : C.line2
  ctx.stroke()
  text(ctx, keyOn ? '● PRIVATE KEY ACTIVE' : '● NO OPEN KEY', M + 318, Y + 45, { size: 13, family: MONO, color: keyOn ? C.ok : C.dim, spacing: '0.12em' })
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  // conversation
  const CX = M + 120
  const CW = 1060
  if (t >= CHAT_CUES.send) {
    const ua = easeOut(prog(t, CHAT_CUES.send, CHAT_CUES.send + 0.3))
    const w = measure(ctx, PROMPT, { size: 22 }) + 44
    ctx.save()
    ctx.globalAlpha *= ua
    ctx.beginPath()
    ctx.roundRect(CX + CW - w, Y + 130, w, 56, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, PROMPT, CX + CW - w + 22, Y + 166, { size: 22, color: C.fg })
    ctx.restore()

    // assistant
    const AY = Y + 230
    panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
    const labels = ['Proving you can pay, without saying who…', 'Paid', 'Asking Claude…']
    if (t < CHAT_CUES.streamStart) {
      const idx = Math.min(2, CHAT_CUES.steps.filter((s) => t >= s).length)
      CHAT_CUES.steps.forEach((s, i) => {
        if (t < (i === 0 ? CHAT_CUES.send : CHAT_CUES.steps[i - 1])) return
        const y = AY + 18 + i * 40
        if (t >= s) doneDot(ctx, CX + 74, y - 7, 11)
        else spinner(ctx, CX + 74, y - 7, 9, t)
        text(ctx, labels[i], CX + 98, y, { size: 17, family: MONO, color: i <= idx ? C.soft : C.dim })
      })
    } else {
      const chars = Math.floor(prog(t, CHAT_CUES.streamStart, CHAT_CUES.streamEnd) * ANSWER.length)
      const lines = wrap(ctx, ANSWER.slice(0, chars), CW - 80, { size: 24 })
      lines.forEach((ln, i) => text(ctx, ln, CX + 70, AY + 24 + i * 40, { size: 24, color: C.soft }))
      if (t < CHAT_CUES.streamEnd && Math.floor(t * 3) % 2 === 0) {
        const last = lines[lines.length - 1] ?? ''
        ctx.fillStyle = C.eth
        ctx.fillRect(CX + 74 + measure(ctx, last, { size: 24 }), AY + 24 + (lines.length - 1) * 40 - 22, 9, 28)
      }
      const ma = easeOut(prog(t, CHAT_CUES.streamEnd, CHAT_CUES.streamEnd + 0.4))
      if (ma > 0) {
        const my = AY + 24 + lines.length * 40 + 14
        text(ctx, 'Claude Sonnet 5.5 · 2.4s ·', CX + 70, my, { size: 15, family: MONO, color: C.dim, alpha: ma })
        const w2 = measure(ctx, 'Claude Sonnet 5.5 · 2.4s · ', { size: 15, family: MONO })
        text(ctx, 'paid privately', CX + 70 + w2, my, { size: 15, family: MONO, color: C.ok, alpha: ma })
        ctx.save()
        ctx.globalAlpha *= ma
        check(ctx, CX + 70 + w2 + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        ctx.restore()
      }
    }
  }

  // composer
  panel(ctx, CX, Y + H - 120, CW, 62, 14, C.panel, C.line2)
  const typed = t < CHAT_CUES.send ? PROMPT.slice(0, Math.floor(prog(t, CHAT_CUES.typeStart, CHAT_CUES.typeEnd) * PROMPT.length)) : ''
  text(ctx, typed || 'Ask privately…', CX + 24, Y + H - 80, { size: 22, color: typed ? C.fg : C.dim })
  if (t < CHAT_CUES.send && t > CHAT_CUES.typeStart && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(CX + 26 + measure(ctx, typed, { size: 22 }), Y + H - 102, 3, 28)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, Y + H - 111, 44, 44, 10)
  ctx.fillStyle = t >= CHAT_CUES.send - 0.15 && t < CHAT_CUES.send + 0.1 ? '#ffffff' : C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, Y + H - 80, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'your wallet stays private · the AI only sees your question', CX + CW / 2, Y + H - 28, { size: 13, family: MONO, color: C.dim, align: 'center' })
  ctx.restore()
}

const POINTS = [
  { k: 'No account. No login.', v: 'Top up with ETH once, then just chat.' },
  { k: 'Nobody knows who paid.', v: 'The AI gets paid, but never sees your wallet.' },
  { k: 'Your chats stay with you.', v: 'Saved only in your browser. Not on our servers.' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 13.9, CHAT_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'SIMPLE AS THAT', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, CHAT_CUES.points[i], CHAT_CUES.points[i] + 0.5))
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
  const a = easeOut(prog(t, CHAT_CUES.end + 0.1, CHAT_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, '138,152,255', 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'NULL Chat is live.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private AI chat, paid with ETH.', 960, 610, { size: 32, color: C.muted, align: 'center' })
  text(ctx, `${PROJECT.domain}/chat`, 960, 730, { size: 40, family: MONO, color: C.fg, align: 'center' })
  text(ctx, PROJECT.xHandle, 960, 790, { size: 26, family: MONO, color: C.muted, align: 'center' })
  if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 920, { size: 22, family: MONO, color: C.muted, align: 'center' })
  ctx.restore()
}

export function drawChat(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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
  vignette(ctx)
  ctx.restore()
}

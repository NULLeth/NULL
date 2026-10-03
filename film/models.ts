// "12 models": ~28 s promo. Title → a wall of the models, all wired to one private
// balance → NULL Chat switching from Claude to Grok and paying privately → three points
// → end card.

import { LIVE } from '../src/config/mode'
import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win, wrap } from './kit'

export const MODELS_DURATION = 28

/** the named models (Auto is a router, not a model) */
const LIST = LIVE.chatModels.filter((m) => m.vendor !== 'Auto')
const PICK = LIST.findIndex((m) => m.id.startsWith('x-ai/'))

export const MODELS_CUES = {
  cards: LIST.map((_, i) => 3.5 + i * 0.22),
  pill: 7.2,
  open: 11.3,
  moveStart: 11.7,
  moveEnd: 12.9,
  select: 13.2,
  typeStart: 13.6,
  typeEnd: 15.0,
  send: 15.2,
  streamStart: 15.6,
  streamEnd: 17.2,
  points: [19.0, 19.9, 20.8],
  end: 22.8,
}

const ETH_RGB = '138,152,255'
const PROMPT = 'Explain zero-knowledge proofs like I’m five.'
const ANSWER =
  'Imagine you know the secret password to a clubhouse. A zero-knowledge proof lets you show the guard you know it without ever saying it out loud. The guard is convinced, but learns nothing about the password.'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, `${LIST.length} models. One private balance.`, 960, 630, { size: 84, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Claude, GPT, Gemini, Grok, DeepSeek and more in NULL Chat.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function wall(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 10.7, 0.4, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const cols = 4
  const CW = 360
  const CH = 140
  const GX = 30
  const GY = 34
  const X0 = (1920 - (cols * CW + (cols - 1) * GX)) / 2
  const Y0 = 190
  const pos = LIST.map((_, i) => ({ x: X0 + (i % cols) * (CW + GX), y: Y0 + Math.floor(i / cols) * (CH + GY) }))
  const PX = 960
  const PY = 860

  // wires to the balance, drawn behind the cards
  const wire = easeInOut(prog(t, MODELS_CUES.pill, MODELS_CUES.pill + 0.9))
  if (wire > 0) {
    ctx.save()
    ctx.strokeStyle = `rgba(${ETH_RGB},0.35)`
    ctx.lineWidth = 1.5
    pos.forEach((p) => {
      const sx = p.x + CW / 2
      const sy = p.y + CH
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + (PX - sx) * wire, sy + (PY - 30 - sy) * wire)
      ctx.stroke()
    })
    ctx.restore()
  }

  LIST.forEach((m, i) => {
    const ca = easeOut(prog(t, MODELS_CUES.cards[i], MODELS_CUES.cards[i] + 0.4))
    if (!ca) return
    const { x } = pos[i]
    const y = pos[i].y + (1 - ca) * 18
    ctx.save()
    ctx.globalAlpha *= ca
    panel(ctx, x, y, CW, CH, 16, C.panel, C.line2)
    text(ctx, m.vendor.toUpperCase(), x + 28, y + 46, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
    text(ctx, m.label, x + 28, y + 100, { size: 36, weight: 600, spacing: '-1px' })
    ctx.restore()
  })

  // the one balance they all draw from
  const pa = easeOut(prog(t, MODELS_CUES.pill + 0.5, MODELS_CUES.pill + 1.0))
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    glow(ctx, PX, PY, 260, ETH_RGB, 0.12)
    const label = 'ONE PRIVATE BALANCE · PAID BY PROOF'
    const w = measure(ctx, label, { size: 20, family: MONO, spacing: '0.14em' }) + 110
    ctx.beginPath()
    ctx.roundRect(PX - w / 2, PY - 30, w, 60, 30)
    ctx.fillStyle = 'rgba(138,152,255,0.10)'
    ctx.fill()
    ctx.strokeStyle = `rgba(${ETH_RGB},0.55)`
    ctx.lineWidth = 1.5
    ctx.stroke()
    nullMark(ctx, PX - w / 2 + 38, PY, 11, 1, 1, 3, C.eth)
    text(ctx, label, PX - w / 2 + 66, PY + 7, { size: 20, family: MONO, color: C.fg, spacing: '0.14em' })
    ctx.restore()
  }
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 10.5, 18.4, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 10.5, 11.3))) * 30
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
  const picked = t >= MODELS_CUES.select
  const model = picked ? LIST[PICK] : LIST[0]
  if (t >= MODELS_CUES.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'Explain zero-knowledge…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, `${model.label} · just now`, X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  }
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 130, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  const bal = 0.05 - (t > MODELS_CUES.streamEnd ? 0.0000016 * easeOut(prog(t, MODELS_CUES.streamEnd, MODELS_CUES.streamEnd + 1)) : 0)
  text(ctx, bal.toFixed(6), X + 28, Y + H - 80, { size: 36, weight: 500, spacing: '-1px' })
  text(ctx, 'ETH', X + 210, Y + H - 80, { size: 16, family: MONO, color: C.muted })

  // top bar
  const M = X + 340
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(M, Y + 76)
  ctx.lineTo(X + W, Y + 76)
  ctx.stroke()
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  // conversation
  const CX = M + 120
  const CW = 1060
  if (t >= MODELS_CUES.send) {
    const ua = easeOut(prog(t, MODELS_CUES.send, MODELS_CUES.send + 0.3))
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
    const AY = Y + 230
    panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
    if (t >= MODELS_CUES.streamStart) {
      const chars = Math.floor(prog(t, MODELS_CUES.streamStart, MODELS_CUES.streamEnd) * ANSWER.length)
      const lines = wrap(ctx, ANSWER.slice(0, chars), CW - 80, { size: 24 })
      lines.forEach((ln, i) => text(ctx, ln, CX + 70, AY + 24 + i * 40, { size: 24, color: C.soft }))
      const ma = easeOut(prog(t, MODELS_CUES.streamEnd, MODELS_CUES.streamEnd + 0.4))
      if (ma > 0) {
        const my = AY + 24 + lines.length * 40 + 14
        const m1 = `${model.label} · 2.1s · `
        text(ctx, m1, CX + 70, my, { size: 15, family: MONO, color: C.dim, alpha: ma })
        const w2 = measure(ctx, m1, { size: 15, family: MONO })
        text(ctx, 'paid privately', CX + 70 + w2, my, { size: 15, family: MONO, color: C.ok, alpha: ma })
        ctx.save()
        ctx.globalAlpha *= ma
        check(ctx, CX + 70 + w2 + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        ctx.restore()
      }
    } else {
      text(ctx, `Asking ${model.label}…`, CX + 70, AY + 20, { size: 17, family: MONO, color: C.soft })
    }
  }

  // composer
  panel(ctx, CX, Y + H - 120, CW, 62, 14, C.panel, C.line2)
  const typed = t < MODELS_CUES.send ? PROMPT.slice(0, Math.floor(prog(t, MODELS_CUES.typeStart, MODELS_CUES.typeEnd) * PROMPT.length)) : ''
  text(ctx, typed || 'Ask privately…', CX + 24, Y + H - 80, { size: 22, color: typed ? C.fg : C.dim })
  if (t < MODELS_CUES.send && t > MODELS_CUES.typeStart && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(CX + 26 + measure(ctx, typed, { size: 22 }), Y + H - 102, 3, 28)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, Y + H - 111, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, Y + H - 80, { size: 24, weight: 600, color: C.bg, align: 'center' })

  // model picker (drawn last so the open list sits on top)
  const open = t >= MODELS_CUES.open && t < MODELS_CUES.select + 0.25
  panel(ctx, M + 28, Y + 20, 290, 40, 8, C.panel, open ? C.line3 : C.line2)
  text(ctx, `${model.label}  ⌄`, M + 46, Y + 46, { size: 16, family: MONO, color: C.fg })
  if (open) {
    const oa = easeOut(prog(t, MODELS_CUES.open, MODELS_CUES.open + 0.25)) * (t > MODELS_CUES.select ? 1 - prog(t, MODELS_CUES.select, MODELS_CUES.select + 0.25) : 1)
    const LX = M + 28
    const LY = Y + 68
    const RH = 42
    ctx.save()
    ctx.globalAlpha *= oa
    panel(ctx, LX, LY, 420, LIST.length * RH + 16, 12, C.panel2, C.line3)
    const hi = Math.round(easeInOut(prog(t, MODELS_CUES.moveStart, MODELS_CUES.moveEnd)) * PICK)
    LIST.forEach((m, i) => {
      const ry = LY + 8 + i * RH
      if (i === hi) {
        ctx.fillStyle = i === PICK && t >= MODELS_CUES.moveEnd ? 'rgba(138,152,255,0.16)' : 'rgba(255,255,255,0.06)'
        ctx.beginPath()
        ctx.roundRect(LX + 6, ry, 408, RH - 4, 8)
        ctx.fill()
      }
      text(ctx, m.label, LX + 22, ry + 26, { size: 17, color: i === hi ? C.fg : C.soft })
      text(ctx, m.vendor, LX + 398, ry + 26, { size: 13, family: MONO, color: C.dim, align: 'right' })
    })
    ctx.restore()
  }
  ctx.restore()
}

const POINTS = [
  { k: 'Switch any time.', v: 'Pick a model at the top of any chat.' },
  { k: 'One private balance.', v: 'Every model is paid from the same ETH, with a proof.' },
  { k: 'No accounts anywhere.', v: 'No OpenAI, Google or xAI login. Nobody knows who paid.' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 18.4, MODELS_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'SIMPLE AS THAT', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, MODELS_CUES.points[i], MODELS_CUES.points[i] + 0.5))
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
  const a = easeOut(prog(t, MODELS_CUES.end + 0.1, MODELS_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, `${LIST.length} models, live in NULL Chat.`, 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'One private balance. Paid with ETH, not with your identity.', 960, 610, { size: 32, color: C.muted, align: 'center' })
  text(ctx, `${PROJECT.domain}/chat`, 960, 730, { size: 40, family: MONO, color: C.fg, align: 'center' })
  text(ctx, PROJECT.xHandle, 960, 790, { size: 26, family: MONO, color: C.muted, align: 'center' })
  if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 920, { size: 22, family: MONO, color: C.muted, align: 'center' })
  ctx.restore()
}

/** Only the very edges darken, so the outer model cards keep full contrast. */
function softEdges(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(960, 540, 700, 960, 540, 1250)
  g.addColorStop(0, 'rgba(6,6,7,0)')
  g.addColorStop(1, 'rgba(6,6,7,0.7)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1920, 1080)
}

export function drawModels(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  wall(ctx, t)
  app(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

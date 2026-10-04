// "Prompt Shield": ~27 s promo. Title → a message full of personal details, the shield
// marks them, the AI only sees placeholders, the answer is filled back in on your side
// → the three layers of private AI, all checked → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const SHIELD_DURATION = 27

export const SHIELD_CUES = {
  typeStart: 3.9,
  typeEnd: 6.6,
  chips: [6.5, 6.8, 7.1, 7.4],
  panel: [7.9, 9.6],
  send: 10.0,
  streamStart: 10.6,
  streamEnd: 12.8,
  morph: [13.2, 13.5, 13.8],
  layers: [17.0, 17.9, 18.8],
  end: 21.0,
}

const OK_RGB = '67,211,146'

type Seg = { s: string; hit?: number }

/** the message, wrapped by hand into two lines, with the four details marked */
const MSG: Seg[][] = [
  [{ s: 'Write a short email to my landlord ' }, { s: 'Anna Becker', hit: 0 }, { s: ' (' }, { s: 'anna.becker@gmx.de', hit: 1 }, { s: ').' }],
  [{ s: 'My number is ' }, { s: '+49 151 2345 6789', hit: 2 }, { s: ', I’m moving out of ' }, { s: 'Lindenstraße 12', hit: 3 }, { s: '.' }],
]
const TAGS = ['[NAME_1]', '[EMAIL_1]', '[PHONE_1]', '[ADDRESS_1]']
const KINDS = ['name', 'email', 'phone', 'address']

type ASeg = { s: string; tag?: string; real?: string; morph?: number }
const ANSWER: ASeg[][] = [
  [{ s: 'Hi ' }, { s: '', tag: '[NAME_1]', real: 'Anna Becker', morph: 0 }, { s: ',' }],
  [{ s: 'I’m writing to let you know I’m moving out of ' }, { s: '', tag: '[ADDRESS_1]', real: 'Lindenstraße 12', morph: 1 }, { s: '' }],
  [{ s: 'at the end of next month. Thank you for everything.' }],
  [{ s: 'You can reach me any time at ' }, { s: '', tag: '[PHONE_1]', real: '+49 151 2345 6789', morph: 2 }, { s: '.' }],
  [{ s: 'Best regards' }],
]

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Prompt Shield', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Your personal details never leave your browser.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

/** shield icon */
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

/** A placeholder tag drawn as a small pill; returns its width. */
function tagPill(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, alpha = 1): number {
  const w = measure(ctx, s, { size, family: MONO })
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  ctx.roundRect(x - 3, y - size * 0.95, w + 6, size * 1.3, 5)
  ctx.fillStyle = 'rgba(138,152,255,0.12)'
  ctx.fill()
  text(ctx, s, x, y, { size, family: MONO, color: C.eth })
  ctx.restore()
  return w
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 15.9, 0.5, 0.45)
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
  if (t >= SHIELD_CUES.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'Write a short email to my…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Claude Sonnet 5.5 · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  }
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
  ctx.beginPath()
  ctx.roundRect(M + 300, Y + 24, 92, 32, 16)
  ctx.strokeStyle = 'rgba(67,211,146,0.45)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  text(ctx, '● TOR', M + 346, Y + 45, { size: 13, family: MONO, color: C.ok, align: 'center', spacing: '0.12em' })
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  const CX = M + 120
  const CW = 1060

  // "what the AI sees" (before sending)
  const pa = t < SHIELD_CUES.send ? easeOut(prog(t, SHIELD_CUES.panel[0], SHIELD_CUES.panel[0] + 0.5)) * (1 - prog(t, SHIELD_CUES.send - 0.35, SHIELD_CUES.send)) : 0
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    const PY = Y + 150 + (1 - pa) * 16
    panel(ctx, CX, PY, CW, 230, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, 'WHAT THE AI SEES', CX + 30, PY + 46, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    const swap = (i: number) => prog(t, SHIELD_CUES.panel[0] + 0.4 + i * 0.25, SHIELD_CUES.panel[0] + 0.7 + i * 0.25)
    MSG.forEach((line, li) => {
      let x = CX + 30
      const y = PY + 104 + li * 52
      line.forEach((seg) => {
        if (seg.hit == null) x += text(ctx, seg.s, x, y, { size: 24, color: C.soft })
        else {
          const p = swap(seg.hit)
          if (p < 1) {
            const w = measure(ctx, seg.s, { size: 24 })
            text(ctx, seg.s, x, y, { size: 24, color: C.ok, alpha: 1 - p })
            if (p > 0) tagPill(ctx, TAGS[seg.hit], x, y, 22, p)
            x += w * (1 - p) + measure(ctx, TAGS[seg.hit], { size: 22, family: MONO }) * p
          } else x += tagPill(ctx, TAGS[seg.hit], x, y, 22) + 4
        }
      })
    })
    text(ctx, 'the real details stay in this browser', CX + 30, PY + 206, { size: 15, family: MONO, color: C.ok })
    ctx.restore()
  }

  // after sending: the user bubble and the answer
  if (t >= SHIELD_CUES.send) {
    const ua = easeOut(prog(t, SHIELD_CUES.send, SHIELD_CUES.send + 0.3))
    ctx.save()
    ctx.globalAlpha *= ua
    const lines = MSG.map((l) => l.map((s) => s.s).join(''))
    const bw = Math.max(...lines.map((l) => measure(ctx, l, { size: 21 }))) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - bw, Y + 110, bw, 96, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    lines.forEach((l, i) => text(ctx, l, CX + CW - bw + 22, Y + 148 + i * 34, { size: 21, color: C.fg }))
    const note = '4 hidden from the AI · show what it saw'
    const nw = measure(ctx, note, { size: 14, family: MONO })
    shieldIcon(ctx, CX + CW - nw - 18, Y + 229, 8, C.ok)
    text(ctx, note, CX + CW - nw, Y + 234, { size: 14, family: MONO, color: C.ok })
    ctx.restore()

    const AY = Y + 280
    panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
    if (t < SHIELD_CUES.streamStart) {
      spinner(ctx, CX + 74, AY + 12, 9, t)
      text(ctx, 'Routing privately…', CX + 98, AY + 19, { size: 17, family: MONO, color: C.soft })
    } else {
      // streamed with placeholders, then filled back in
      const total = ANSWER.reduce((n, l) => n + l.reduce((m, s) => m + (s.tag ?? s.s).length, 0), 0)
      let budget = Math.floor(prog(t, SHIELD_CUES.streamStart, SHIELD_CUES.streamEnd) * total)
      ANSWER.forEach((line, li) => {
        let x = CX + 70
        const y = AY + 22 + li * 42
        for (const seg of line) {
          if (budget <= 0) break
          if (seg.tag) {
            const take = Math.min(budget, seg.tag.length)
            budget -= seg.tag.length
            const m = seg.morph != null ? prog(t, SHIELD_CUES.morph[seg.morph], SHIELD_CUES.morph[seg.morph] + 0.4) : 0
            if (take < seg.tag.length) {
              x += text(ctx, seg.tag.slice(0, take), x, y, { size: 22, family: MONO, color: C.eth })
            } else if (m <= 0) {
              x += tagPill(ctx, seg.tag, x, y, 21) + 4
            } else {
              const tw = measure(ctx, seg.tag, { size: 21, family: MONO })
              const rw = measure(ctx, seg.real!, { size: 24 })
              if (m < 1) tagPill(ctx, seg.tag, x, y, 21, 1 - m)
              ctx.save()
              ctx.globalAlpha *= m
              ctx.fillStyle = `rgba(${OK_RGB},${0.14 * (1 - prog(t, SHIELD_CUES.morph[seg.morph!] + 0.4, SHIELD_CUES.morph[seg.morph!] + 1.4))})`
              ctx.beginPath()
              ctx.roundRect(x - 3, y - 22, rw + 6, 30, 5)
              ctx.fill()
              text(ctx, seg.real!, x, y, { size: 24, color: C.fg })
              ctx.restore()
              x += tw + (rw - tw) * m + 4 * (1 - m)
            }
          } else {
            const take = Math.min(budget, seg.s.length)
            budget -= seg.s.length
            x += text(ctx, seg.s.slice(0, take), x, y, { size: 24, color: C.soft })
          }
        }
      })
      const ma = easeOut(prog(t, SHIELD_CUES.streamEnd, SHIELD_CUES.streamEnd + 0.4))
      if (ma > 0) {
        const my = AY + 22 + ANSWER.length * 42 + 14
        ctx.save()
        ctx.globalAlpha *= ma
        const m1 = 'Claude Sonnet 5.5 · 2.8s · '
        text(ctx, m1, CX + 70, my, { size: 15, family: MONO, color: C.dim })
        let mx = CX + 70 + measure(ctx, m1, { size: 15, family: MONO })
        shieldIcon(ctx, mx + 8, my - 5, 7, C.ok)
        text(ctx, 'shield · ', mx + 20, my, { size: 15, family: MONO, color: C.ok })
        mx += 20 + measure(ctx, 'shield · ', { size: 15, family: MONO })
        text(ctx, 'paid privately', mx, my, { size: 15, family: MONO, color: C.ok })
        check(ctx, mx + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        const fa = easeOut(prog(t, SHIELD_CUES.morph[2] + 0.4, SHIELD_CUES.morph[2] + 0.9))
        text(ctx, 'filled back in on your device', CX + 70, my + 30, { size: 15, family: MONO, color: C.faint, alpha: fa })
        ctx.restore()
      }
    }
  }

  // shield bar
  const BY = Y + H - 150
  const chipsOn = SHIELD_CUES.chips.filter((c) => t >= c).length
  if (chipsOn && t < SHIELD_CUES.send) {
    let x = CX
    const y = BY - 28
    shieldIcon(ctx, x + 8, y - 5, 8, C.ok)
    x += 22
    x += text(ctx, 'SHIELD', x, y, { size: 14, family: MONO, color: C.ok, spacing: '0.12em' }) + 14
    x += text(ctx, `${chipsOn} of ${chipsOn} hidden from the AI`, x, y, { size: 14, family: MONO, color: C.dim }) + 14
    const values = ['Anna Becker', 'anna.becker@gmx.de', '+49 151 2345 6789', 'Lindenstraße 12']
    values.slice(0, chipsOn).forEach((v, i) => {
      const ca = easeOut(prog(t, SHIELD_CUES.chips[i], SHIELD_CUES.chips[i] + 0.25))
      const label = `${KINDS[i]} · ${v}`
      const w = measure(ctx, label, { size: 13, family: MONO }) + 20
      ctx.save()
      ctx.globalAlpha *= ca
      ctx.beginPath()
      ctx.roundRect(x, y - 18, w, 26, 6)
      ctx.fillStyle = 'rgba(67,211,146,0.07)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(67,211,146,0.35)'
      ctx.lineWidth = 1.2
      ctx.stroke()
      text(ctx, label, x + 10, y, { size: 13, family: MONO, color: C.ok })
      ctx.restore()
      x += w + 8
    })
  }

  // composer (two lines tall) with WEB · IMAGE · SHIELD
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const btn = (bx: number, w: number, label: string, on: boolean) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = on ? 'rgba(67,211,146,0.08)' : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = on ? 'rgba(67,211,146,0.4)' : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (on) shieldIcon(ctx, bx + 22, BY + 48, 8, C.ok)
    text(ctx, label, on ? bx + 38 : bx + w / 2, BY + 54, { size: 14, family: MONO, color: on ? C.ok : C.dim, align: on ? 'left' : 'center', spacing: '0.08em' })
  }
  btn(CX + 12, 74, 'WEB', false)
  btn(CX + 94, 92, 'IMAGE', false)
  btn(CX + 194, 112, 'SHIELD', true)
  const TX = CX + 326
  if (t < SHIELD_CUES.send) {
    const total = MSG.reduce((n, l) => n + l.reduce((m, s) => m + s.s.length, 0), 0)
    let budget = Math.floor(prog(t, SHIELD_CUES.typeStart, SHIELD_CUES.typeEnd) * total)
    if (budget <= 0) text(ctx, 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
    let cx = TX
    let cy = BY + 40
    MSG.forEach((line, li) => {
      let x = TX
      const y = BY + 40 + li * 32
      line.forEach((seg) => {
        if (budget <= 0) return
        const take = Math.min(budget, seg.s.length)
        budget -= seg.s.length
        const s = seg.s.slice(0, take)
        const w = text(ctx, s, x, y, { size: 19, color: C.fg })
        if (seg.hit != null && t >= SHIELD_CUES.chips[seg.hit]) {
          ctx.fillStyle = `rgba(${OK_RGB},0.8)`
          ctx.fillRect(x, y + 5, w, 2)
        }
        x += w
        cx = x
        cy = y
      })
    })
    if (t > SHIELD_CUES.typeStart && Math.floor(t * 2.4) % 2 === 0) {
      ctx.fillStyle = C.eth
      ctx.fillRect(cx + 2, cy - 20, 3, 25)
    }
  } else text(ctx, 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 26, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 57, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'payment identity hidden · personal details shielded · Tor ✓ your IP is hidden too', CX + CW / 2, Y + H - 24, {
    size: 13,
    family: MONO,
    color: C.ok,
    align: 'center',
  })
  ctx.restore()
}

const LAYERS = [
  { n: '1', k: 'TEXT', v: 'Personal details swapped for placeholders', who: 'Prompt Shield' },
  { n: '2', k: 'PAYMENT', v: 'Paid with a zero-knowledge proof', who: 'zkAPI' },
  { n: '3', k: 'NETWORK', v: 'Your IP hidden behind Tor relays', who: 'Tor' },
]

function layers(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 15.9, SHIELD_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'THE THREE LAYERS OF PRIVATE AI', 960, 220, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  LAYERS.forEach((l, i) => {
    const pa = easeOut(prog(t, SHIELD_CUES.layers[i] - 0.5, SHIELD_CUES.layers[i]))
    if (!pa) return
    const y = 350 + i * 190 - (1 - pa) * 16
    const done = t >= SHIELD_CUES.layers[i]
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, 360, y - 70, 1200, 150, 18, C.panel, done ? 'rgba(67,211,146,0.35)' : C.line2)
    text(ctx, l.n, 420, y + 14, { size: 64, weight: 600, color: C.faint, align: 'center' })
    text(ctx, l.k, 480, y - 18, { size: 16, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, l.v, 480, y + 28, { size: 34, weight: 600, spacing: '-1px' })
    text(ctx, l.who, 1440, y + 12, { size: 22, family: MONO, color: done ? C.ok : C.dim, align: 'right' })
    if (done) doneDot(ctx, 1500, y + 4, 18, easeOut(prog(t, SHIELD_CUES.layers[i], SHIELD_CUES.layers[i] + 0.3)))
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const a = easeOut(prog(t, SHIELD_CUES.end + 0.1, SHIELD_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'All 3 layers. In your browser.', 960, 540, { size: 80, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Prompt Shield + zkAPI + Tor, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawShield(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  layers(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

// "Private web search": ~27 s promo. Title → NULL Chat with WEB switched on (proof steps,
// live search, streamed answer, sources) → three points → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, doneDot, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, vignette, win, wrap } from './kit'

export const WEB_DURATION = 27

export const WEB_CUES = {
  toggle: 4.0,
  typeStart: 4.6,
  typeEnd: 6.6,
  send: 6.9,
  steps: [7.5, 8.1, 9.4],
  streamStart: 9.6,
  streamEnd: 13.0,
  sources: [13.4, 13.7, 14.0, 14.3],
  points: [17.2, 18.1, 19.0],
  end: 21.8,
}

const PROMPT = 'What is zkAPI and when did it launch?'
const ANSWER =
  'zkAPI is a private way to pay for AI and other APIs, built by the Ethereum Foundation and the Open Anonymity Project. It went live on Ethereum mainnet on October 1, 2026. You deposit ETH once, then every request is paid with a zero-knowledge proof, so the provider gets paid without learning which wallet paid.'

const SOURCES = [
  { title: 'Introducing zkAPI', host: 'blog.ethereum.org' },
  { title: 'OpenAnonymity/zkapi', host: 'github.com' },
  { title: 'ZK API usage credits: LLMs and beyond', host: 'ethresear.ch' },
  { title: 'zkAPI documentation', host: 'zkapi.openanonymity.ai' },
]

const ETH_RGB = '138,152,255'

/** Small line globe, like the icon on the WEB switch. */
function globe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, width = 2) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.stroke()
  ctx.restore()
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Private web search', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Ask AI about anything new. Nobody knows who paid.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 16.4, 0.5, 0.45)
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
  if (t >= WEB_CUES.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'What is zkAPI and when…', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Claude Sonnet 5.5 · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  }
  // balance
  text(ctx, 'PRIVATE BALANCE', X + 28, Y + H - 130, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '● MAINNET', X + 312, Y + H - 130, { size: 12, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
  const bal = 0.05 - (t > WEB_CUES.streamEnd ? 0.0000071 * easeOut(prog(t, WEB_CUES.streamEnd, WEB_CUES.streamEnd + 1)) : 0)
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
  const keyOn = t >= WEB_CUES.steps[1]
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
  if (t >= WEB_CUES.send) {
    const ua = easeOut(prog(t, WEB_CUES.send, WEB_CUES.send + 0.3))
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
    const labels = ['Proving you can pay, without saying who…', 'Paid', 'Searching the web privately…']
    if (t < WEB_CUES.streamStart) {
      const idx = Math.min(2, WEB_CUES.steps.filter((s) => t >= s).length)
      WEB_CUES.steps.forEach((s, i) => {
        if (t < (i === 0 ? WEB_CUES.send : WEB_CUES.steps[i - 1])) return
        const y = AY + 18 + i * 40
        if (t >= s) doneDot(ctx, CX + 74, y - 7, 11)
        else spinner(ctx, CX + 74, y - 7, 9, t)
        text(ctx, labels[i], CX + 98, y, { size: 17, family: MONO, color: i <= idx ? C.soft : C.dim })
      })
    } else {
      const chars = Math.floor(prog(t, WEB_CUES.streamStart, WEB_CUES.streamEnd) * ANSWER.length)
      const lines = wrap(ctx, ANSWER.slice(0, chars), CW - 80, { size: 24 })
      lines.forEach((ln, i) => text(ctx, ln, CX + 70, AY + 24 + i * 40, { size: 24, color: C.soft }))
      if (t < WEB_CUES.streamEnd && Math.floor(t * 3) % 2 === 0) {
        const last = lines[lines.length - 1] ?? ''
        ctx.fillStyle = C.eth
        ctx.fillRect(CX + 74 + measure(ctx, last, { size: 24 }), AY + 24 + (lines.length - 1) * 40 - 22, 9, 28)
      }
      const full = wrap(ctx, ANSWER, CW - 80, { size: 24 }).length
      // sources
      const SY = AY + 24 + full * 40 + 10
      const sa = easeOut(prog(t, WEB_CUES.sources[0] - 0.2, WEB_CUES.sources[0] + 0.2))
      if (sa > 0) text(ctx, 'SOURCES', CX + 70, SY, { size: 14, family: MONO, color: C.dim, spacing: '0.14em', alpha: sa })
      SOURCES.forEach((s, i) => {
        const pa = easeOut(prog(t, WEB_CUES.sources[i], WEB_CUES.sources[i] + 0.35))
        if (!pa) return
        const x = CX + 70 + (i % 2) * 496
        const y = SY + 18 + Math.floor(i / 2) * 80 + (1 - pa) * 10
        ctx.save()
        ctx.globalAlpha *= pa
        panel(ctx, x, y, 482, 66, 10, 'rgba(255,255,255,0.02)', C.line2)
        text(ctx, String(i + 1), x + 20, y + 28, { size: 14, family: MONO, color: C.dim })
        text(ctx, s.title, x + 46, y + 28, { size: 18, color: C.soft })
        text(ctx, s.host, x + 46, y + 52, { size: 14, family: MONO, color: C.dim })
        ctx.restore()
      })
      // meta
      const ma = easeOut(prog(t, WEB_CUES.sources[3] + 0.2, WEB_CUES.sources[3] + 0.6))
      if (ma > 0) {
        const my = SY + 18 + 160 + 14
        ctx.save()
        ctx.globalAlpha *= ma
        const m1 = 'Claude Sonnet 5.5 · '
        text(ctx, m1, CX + 70, my, { size: 15, family: MONO, color: C.dim })
        let mx = CX + 70 + measure(ctx, m1, { size: 15, family: MONO })
        globe(ctx, mx + 7, my - 5, 7, C.dim, 1.4)
        const m2 = ' web · 4.1s · '
        text(ctx, m2, mx + 15, my, { size: 15, family: MONO, color: C.dim })
        mx += 15 + measure(ctx, m2, { size: 15, family: MONO })
        text(ctx, 'paid privately', mx, my, { size: 15, family: MONO, color: C.ok })
        check(ctx, mx + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        ctx.restore()
      }
    }
  }

  // composer with the WEB switch
  const BY = Y + H - 120
  panel(ctx, CX, BY, CW, 62, 14, C.panel, C.line2)
  const on = t >= WEB_CUES.toggle
  ctx.beginPath()
  ctx.roundRect(CX + 10, BY + 9, 100, 44, 10)
  ctx.fillStyle = on ? 'rgba(138,152,255,0.12)' : 'rgba(0,0,0,0)'
  ctx.fill()
  ctx.strokeStyle = on ? 'rgba(138,152,255,0.5)' : C.line2
  ctx.lineWidth = 1.5
  ctx.stroke()
  globe(ctx, CX + 38, BY + 31, 9, on ? C.eth : C.dim, 1.8)
  text(ctx, 'WEB', CX + 56, BY + 37, { size: 15, family: MONO, color: on ? C.eth : C.dim, spacing: '0.08em' })
  // click pulse on the switch
  const pulse = prog(t, WEB_CUES.toggle - 0.05, WEB_CUES.toggle + 0.6)
  if (pulse > 0 && pulse < 1) {
    ctx.beginPath()
    ctx.roundRect(CX + 10 - pulse * 14, BY + 9 - pulse * 14, 100 + pulse * 28, 44 + pulse * 28, 10 + pulse * 10)
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.5 * (1 - pulse)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  const typed = t < WEB_CUES.send ? PROMPT.slice(0, Math.floor(prog(t, WEB_CUES.typeStart, WEB_CUES.typeEnd) * PROMPT.length)) : ''
  const TX = CX + 128
  text(ctx, typed || (on ? 'Search the web privately…' : 'Ask privately…'), TX, BY + 40, { size: 22, color: typed ? C.fg : C.dim })
  if (t < WEB_CUES.send && t > WEB_CUES.typeStart && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(TX + 2 + measure(ctx, typed, { size: 22 }), BY + 18, 3, 28)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 9, 44, 44, 10)
  ctx.fillStyle = t >= WEB_CUES.send - 0.15 && t < WEB_CUES.send + 0.1 ? '#ffffff' : C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 40, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'your wallet stays private · the AI and the search only see your question', CX + CW / 2, Y + H - 28, {
    size: 13,
    family: MONO,
    color: C.dim,
    align: 'center',
  })
  ctx.restore()
}

const POINTS = [
  { k: 'Fresh answers.', v: 'The AI searches the web live, even for news from today.' },
  { k: 'Real sources.', v: 'Every answer shows the links it used.' },
  { k: 'Nobody knows who paid.', v: 'Paid from your private balance with a zero-knowledge proof.' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 16.4, WEB_CUES.end, 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'ONE SWITCH: WEB', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, WEB_CUES.points[i], WEB_CUES.points[i] + 0.5))
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
  const a = easeOut(prog(t, WEB_CUES.end + 0.1, WEB_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Private web search is live.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'In NULL Chat. Paid with ETH, not with your identity.', 960, 610, { size: 32, color: C.muted, align: 'center' })
  text(ctx, `${PROJECT.domain}/chat`, 960, 730, { size: 40, family: MONO, color: C.fg, align: 'center' })
  text(ctx, PROJECT.xHandle, 960, 790, { size: 26, family: MONO, color: C.muted, align: 'center' })
  if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 920, { size: 22, family: MONO, color: C.muted, align: 'center' })
  ctx.restore()
}

export function drawWeb(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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

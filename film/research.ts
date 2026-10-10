// "Private Deep Research": ~28 s promo. Title → RESEARCH on, a question → the plan (4 queries)
// → four searches in parallel, each paid by proof → the report streams with numbered citations
// → sources → how it runs → end card. The UI pieces are the ones NULL Chat shows.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const RESEARCH_DURATION = 28

export const RESEARCH_CUES = {
  toggle: 3.9,
  typeStart: 4.5,
  typeEnd: 6.0,
  send: 6.3,
  plan: 7.6,
  searches: [7.9, 8.1, 8.3, 8.5],
  found: [9.2, 9.6, 10.0, 10.5],
  write: 10.7,
  streamStart: 11.1,
  streamEnd: 15.6,
  sources: 15.8,
  hops: [19.6, 20.4, 21.2, 22.0],
  end: 23.8,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const Q = 'Compare Signal, Session and SimpleX for private messaging.'
const QUERIES = [
  { q: 'Signal vs Session vs SimpleX metadata privacy', n: 4 },
  { q: 'SimpleX messaging without user identifiers', n: 3 },
  { q: 'Session messenger onion routing how it works', n: 3 },
  { q: 'Signal phone number and usernames privacy', n: 2 },
]
const TELESCOPE = new Path2D('m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44 M13.56 11.747l4.332-.924 M16 21l-3.105-6.21 M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z M6.158 8.633l1.114 4.456 M8 21l3.105-6.21 M14 13a2 2 0 1 1-4 0a2 2 0 1 1 4 0')

/** report lines: text with [n] citations, or a heading */
const REPORT: { h?: string; t?: string }[] = [
  { t: 'All three encrypt your messages end to end. They differ in what they' },
  { t: 'know about you: Signal needs a phone number [1][9], Session routes' },
  { t: 'through onion paths without one [7][8], SimpleX has no user IDs [5].' },
  { h: 'Metadata' },
  { t: '• Signal keeps very little, but your number is the account [1][2].' },
  { t: '• SimpleX uses one-off queues, so contacts can’t be linked [5][6].' },
]

const SOURCES = [
  'signal.org', 'signal.org', 'eff.org', 'privacyguides.org', 'simplex.chat', 'simplex.chat', 'getsession.org', 'getsession.org', 'support.signal.org', 'wikipedia.org', 'theverge.com', 'github.com',
]

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Private Deep Research', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Ask once. It searches, reads and writes a cited report.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

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

/** a line of report text with [n] citations drawn as small eth-coloured marks; returns width */
function citeLine(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, alpha = 1) {
  let cx = x
  for (const part of s.split(/(\[\d+\])/)) {
    if (!part) continue
    if (/^\[\d+\]$/.test(part)) cx += text(ctx, part, cx, y - 2, { size: size * 0.72, family: MONO, color: C.eth, alpha })
    else cx += text(ctx, part, cx, y, { size, color: C.soft, alpha })
  }
  return cx - x
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = RESEARCH_CUES
  const a = win(t, 3.1, 19.3, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  const X = 120
  const Y = 90 + rise
  const W = 1680
  const H = 900
  panel(ctx, X, Y, W, H, 22, C.panel, C.line2)

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
  const sent = t >= K.send
  if (sent) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'Compare Signal, Session and…', X + 32, Y + 178, { size: 17, color: C.fg })
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
  const on = t >= K.toggle

  // empty state
  const ea = 1 - prog(t, K.send - 0.2, K.send + 0.2)
  if (ea > 0) {
    ctx.save()
    ctx.globalAlpha *= ea
    nullMark(ctx, mid, Y + 240, 26, 1, 1, 5)
    text(ctx, on ? 'Research privately.' : 'Ask privately.', mid, Y + 330, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    if (on) {
      text(ctx, 'The model plans a few web searches, runs them in parallel', mid, Y + 386, { size: 19, color: C.muted, align: 'center' })
      text(ctx, 'and writes a report with numbered sources.', mid, Y + 414, { size: 19, color: C.muted, align: 'center' })
    }
    ctx.restore()
  }

  // ── after sending: question, trail, report, sources ──
  if (sent) {
    const ua = easeOut(prog(t, K.send, K.send + 0.3))
    ctx.save()
    ctx.globalAlpha *= ua
    const qw = measure(ctx, Q, { size: 20 }) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 104, qw, 50, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, Q, CX + CW - qw + 22, Y + 136, { size: 20, color: C.fg })
    ctx.restore()

    const AY = Y + 182
    panel(ctx, CX, AY, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 20, 8, 1, 1, 2.5)
    const TX = CX + 64
    const TW = CW - 64
    if (t < K.plan) {
      spinner(ctx, TX + 10, AY + 20, 9, t)
      text(ctx, t < K.send + 0.5 ? 'Generating proof…' : 'Planning the research…', TX + 32, AY + 26, { size: 17, family: MONO, color: C.soft })
    } else {
      // the trail
      const pa = easeOut(prog(t, K.plan, K.plan + 0.3))
      ctx.save()
      ctx.globalAlpha *= pa
      const sources = QUERIES.reduce((n, s, i) => n + (t >= K.found[i] ? s.n : 0), 0)
      panel(ctx, TX, AY, TW, 176, 12, 'rgba(255,255,255,0.02)', C.line2)
      icon(ctx, TELESCOPE, TX + 26, AY + 28, 17, C.eth, 2)
      text(ctx, `RESEARCH · ${QUERIES.length} SEARCHES · ${sources} SOURCES`, TX + 44, AY + 33, { size: 13, family: MONO, color: C.dim, spacing: '0.12em' })
      QUERIES.forEach((s, i) => {
        const y = AY + 68 + i * 30
        const searching = t >= K.searches[i] && t < K.found[i]
        const done = t >= K.found[i]
        if (done) check(ctx, TX + 26, y - 6, 14, C.ok, 2.2)
        else if (searching) spinner(ctx, TX + 26, y - 6, 7, t)
        else {
          ctx.fillStyle = C.faint
          ctx.beginPath()
          ctx.arc(TX + 26, y - 6, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        text(ctx, s.q, TX + 46, y, { size: 17, color: C.soft })
        text(ctx, done ? `${s.n} sources` : searching ? 'searching…' : 'waiting', TX + TW - 20, y, { size: 13, family: MONO, color: done ? C.dim : C.faint, align: 'right' })
        // each search is its own paid request
        const pp = prog(t, K.searches[i], K.searches[i] + 0.6)
        if (pp > 0 && pp < 1) text(ctx, 'paid by proof ✓', TX + TW - 120 - 20, y, { size: 12, family: MONO, color: C.ok, align: 'right', alpha: Math.sin(Math.PI * pp) })
      })
      ctx.restore()

      // the report
      const RY = AY + 206
      if (t >= K.write && t < K.streamStart) {
        spinner(ctx, TX + 10, RY + 4, 9, t)
        text(ctx, 'Writing the report…', TX + 32, RY + 10, { size: 17, family: MONO, color: C.soft })
      }
      if (t >= K.streamStart) {
        const total = REPORT.reduce((n, l) => n + (l.h ?? l.t ?? '').length, 0)
        let budget = Math.floor(prog(t, K.streamStart, K.streamEnd) * total)
        let y = RY + 8
        for (const l of REPORT) {
          if (budget <= 0) break
          const s = l.h ?? l.t ?? ''
          const shown = s.slice(0, budget)
          budget -= s.length
          if (l.h) {
            y += 10
            text(ctx, shown, TX, y, { size: 20, weight: 600, color: C.fg })
            y += 32
          } else {
            citeLine(ctx, shown, TX, y, 18.5)
            y += 29
          }
        }
      }
      // sources + meta
      const sa = easeOut(prog(t, K.sources, K.sources + 0.4))
      if (sa > 0) {
        ctx.save()
        ctx.globalAlpha *= sa
        const SY = BY - 138
        text(ctx, 'SOURCES', TX, SY, { size: 12, family: MONO, color: C.dim, spacing: '0.14em' })
        SOURCES.forEach((d, i) => {
          const col = i % 6
          const row = Math.floor(i / 6)
          const x = TX + col * (TW / 6)
          const yy = SY + 14 + row * 40
          panel(ctx, x, yy, TW / 6 - 8, 32, 6, C.panel, C.line2)
          text(ctx, `${i + 1}`, x + 10, yy + 21, { size: 11, family: MONO, color: C.dim })
          text(ctx, d, x + 28, yy + 21, { size: 12, family: MONO, color: C.soft })
        })
        const my = SY + 112
        let mx = TX
        mx += text(ctx, 'Claude Sonnet 5.5 · ', mx, my, { size: 13.5, family: MONO, color: C.dim })
        icon(ctx, TELESCOPE, mx + 8, my - 5, 13, C.dim, 2)
        mx += 20
        mx += text(ctx, 'research · 41.8s · ', mx, my, { size: 13.5, family: MONO, color: C.dim })
        mx += text(ctx, '18¢', mx, my, { size: 13.5, family: MONO, color: C.soft })
        text(ctx, ' · paid by proof ✓', mx, my, { size: 13.5, family: MONO, color: C.ok })
        ctx.restore()
      }
    }
  }

  // research row + composer
  if (on && !sent) {
    const ra = easeOut(prog(t, K.toggle, K.toggle + 0.3))
    ctx.save()
    ctx.globalAlpha *= ra
    icon(ctx, TELESCOPE, CX + 9, BY - 30, 15, C.eth, 2)
    text(ctx, 'RESEARCH', CX + 24, BY - 25, { size: 13, family: MONO, color: C.eth, spacing: '0.12em' })
    text(ctx, '3–5 web searches + a cited report · usually under a minute · placeholders never go into a search', CX + 116, BY - 25, { size: 13, family: MONO, color: C.dim })
    ctx.restore()
  }
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const tool = (bx: number, w: number, label: string, active: boolean, color: 'eth' | 'ok', draw: (cx: number, cy: number, c: string) => void) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = active ? (color === 'eth' ? `rgba(${ETH_RGB},0.1)` : `rgba(${OK_RGB},0.08)`) : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = active ? (color === 'eth' ? `rgba(${ETH_RGB},0.45)` : `rgba(${OK_RGB},0.4)`) : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    const c = active ? (color === 'eth' ? C.eth : C.ok) : C.dim
    draw(bx + 23, BY + 48, c)
    if (label) text(ctx, label, bx + 40, BY + 54, { size: 14, family: MONO, color: c, spacing: '0.08em' })
  }
  const dot = (cx: number, cy: number, c: string) => {
    ctx.strokeStyle = c
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.stroke()
  }
  let bx = CX + 12
  tool(bx, 46, '', false, 'ok', dot)
  bx += 54
  tool(bx, 46, '', false, 'eth', dot)
  bx += 54
  const rw = on ? 140 : 46
  tool(bx, rw, on ? 'RESEARCH' : '', on, 'eth', (cx, cy, c) => icon(ctx, TELESCOPE, cx, cy, 20, c, 2))
  bx += rw + 8
  tool(bx, 46, '', false, 'eth', dot)
  bx += 54
  tool(bx, 116, 'SHIELD', true, 'ok', (cx, cy, c) => shieldIcon(ctx, cx, cy, 8, c))
  bx += 124
  tool(bx, 46, '', false, 'eth', dot)
  bx += 54
  const TX = bx + 14
  if (!sent) {
    const n = Math.floor(prog(t, K.typeStart, K.typeEnd) * Q.length)
    if (n <= 0) text(ctx, on ? 'Ask a research question…' : 'Ask privately…', TX, BY + 56, { size: 20, color: C.dim })
    else {
      const w = text(ctx, Q.slice(0, n), TX, BY + 56, { size: 18, color: C.fg })
      if (Math.floor(t * 2.4) % 2 === 0) {
        ctx.fillStyle = C.eth
        ctx.fillRect(TX + w + 2, BY + 36, 3, 26)
      }
    }
  } else text(ctx, 'Ask a research question…', TX, BY + 56, { size: 20, color: C.dim })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 26, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 57, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'payment identity hidden · personal details shielded · search queries go to the search provider via OpenRouter', CX + CW / 2, Y + H - 24, { size: 13, family: MONO, color: C.ok, align: 'center' })

  // pointer clicks RESEARCH
  const tx = CX + 12 + 108 + 23
  const ty = BY + 48
  const m = easeInOut(prog(t, K.toggle - 0.8, K.toggle - 0.1))
  pointer(ctx, CX + 520 + (tx - CX - 520) * m - 4, BY - 220 + (ty - BY + 220) * m - 4, win(t, K.toggle - 0.9, K.toggle + 0.5, 0.2, 0.3))
  const r = prog(t, K.toggle, K.toggle + 0.45)
  if (r > 0 && r < 1) {
    ctx.beginPath()
    ctx.arc(tx, ty, 8 + r * 24, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.6 * (1 - r)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()
}

const HOPS = [
  { k: 'YOUR QUESTION', v: 'shielded first' },
  { k: 'THE PLAN', v: '4 search queries' },
  { k: 'PARALLEL SEARCH', v: 'each paid by proof' },
  { k: 'THE REPORT', v: 'cited [1]…[12]' },
]

function howItRuns(ctx: CanvasRenderingContext2D, t: number) {
  const K = RESEARCH_CUES
  const a = win(t, 19.0, K.end, 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HOW IT RUNS', 960, 220, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'One question. Many private searches. One report.', 960, 288, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })
  HOPS.forEach((h, i) => {
    const x = 120 + i * 430
    const lit = easeOut(prog(t, K.hops[i], K.hops[i] + 0.3))
    panel(ctx, x, 420, 380, 200, 18, C.panel, lit ? `rgba(${i === 3 ? ETH_RGB : OK_RGB},${0.2 + 0.4 * lit})` : C.line2)
    text(ctx, h.k, x + 30, 470, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, h.v, x + 30, 550, { size: 32, weight: 600, spacing: '-1px', color: lit ? C.fg : C.muted })
    if (i === 2)
      for (let k = 0; k < 4; k++) {
        const on = t >= K.hops[2] + 0.1 * k
        ctx.fillStyle = on ? `rgba(${OK_RGB},0.8)` : C.faint
        ctx.beginPath()
        ctx.roundRect(x + 30 + k * 40, 580, 30, 8, 4)
        ctx.fill()
      }
    if (i < 3) {
      ctx.strokeStyle = C.line3
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x + 384, 520)
      ctx.lineTo(x + 426, 520)
      ctx.moveTo(x + 418, 514)
      ctx.lineTo(x + 426, 520)
      ctx.lineTo(x + 418, 526)
      ctx.stroke()
    }
  })
  const fa = easeOut(prog(t, K.hops[3] + 0.3, K.hops[3] + 0.8))
  text(ctx, 'no placeholder ever goes into a search · every call paid from your private balance', 960, 720, { size: 20, family: MONO, color: C.muted, align: 'center', alpha: fa })
  text(ctx, 'search queries go to the search provider via OpenRouter · usually a few cents to ~30¢', 960, 760, { size: 16, family: MONO, color: C.dim, align: 'center', alpha: fa })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = RESEARCH_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.07)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Research privately.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private Deep Research, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawResearch(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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

// "AI Shield": ~29 s promo. Title → a message about people, a company and a city: the
// patterns find nothing → the AI switch, the model loads once → it finds all three →
// the AI only sees placeholders → how it runs inside the browser → end card.
// The message and what the model finds are what the real model returns for it.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const AISHIELD_DURATION = 29

export const AISHIELD_CUES = {
  typeStart: 3.9,
  typeEnd: 6.5,
  patterns: 6.9,
  click: 8.4,
  ready: 10.0,
  chips: [10.4, 10.7, 11.0],
  panel: [11.6, 13.2],
  hops: [17.3, 18.3, 19.3],
  stats: [20.3, 20.7, 21.1],
  end: 23.0,
}

const ETH_RGB = '138,152,255'
const OK_RGB = '67,211,146'

type Seg = { s: string; hit?: number }

/** the message, wrapped by hand into two lines, with what the model finds marked */
const MSG: Seg[][] = [
  [{ s: 'I had lunch with ' }, { s: 'Jonas Weber', hit: 0 }, { s: ' from ' }, { s: 'Siemens', hit: 1 }, { s: '.' }],
  [{ s: 'He thinks I should move to ' }, { s: 'Munich', hit: 2 }, { s: '.' }],
]
const VALUES = ['Jonas Weber', 'Siemens', 'Munich']
const TAGS = ['[NAME_1]', '[ORG_1]', '[PLACE_1]']
const KINDS = ['name', 'organisation', 'place']

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'AI Shield', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'A small AI in your browser hides who you talk about.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
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

/** A placeholder tag drawn as a small pill; returns its width. */
function tagPill(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, alpha = 1): number {
  const w = measure(ctx, s, { size, family: MONO })
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.beginPath()
  ctx.roundRect(x - 3, y - size * 0.95, w + 6, size * 1.3, 5)
  ctx.fillStyle = `rgba(${ETH_RGB},0.12)`
  ctx.fill()
  text(ctx, s, x, y, { size, family: MONO, color: C.eth })
  ctx.restore()
  return w
}

/** mouse pointer */
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

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 16.6, 0.5, 0.45)
  if (!a) return
  const K = AISHIELD_CUES
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
  text(ctx, 'Your chats stay in this browser.', X + 170, Y + 186, { size: 16, color: C.dim, align: 'center' })
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
  text(ctx, 'LIVE', X + W - 190, Y + 45, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  const CX = M + 120
  const CW = 1060
  const mid = CX + CW / 2

  // empty chat
  const ea = 1 - prog(t, K.patterns - 0.4, K.patterns)
  if (ea > 0) {
    ctx.save()
    ctx.globalAlpha *= ea
    nullMark(ctx, mid, Y + 260, 26, 1, 1, 5)
    text(ctx, 'Ask privately.', mid, Y + 350, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    text(ctx, 'Prompt Shield is on: details are swapped for placeholders before sending.', mid, Y + 404, { size: 18, family: MONO, color: C.ok, align: 'center' })
    ctx.restore()
  }

  // the patterns alone, then the AI
  const pa = win(t, K.patterns, K.panel[0], 0.45, 0.35)
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    const PY = Y + 150 + (1 - easeOut(prog(t, K.patterns, K.patterns + 0.5))) * 16
    panel(ctx, CX, PY, CW, 300, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, 'PATTERNS ALONE', CX + 30, PY + 50, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    check(ctx, CX + 44, PY + 102, 18, C.ok, 2.6)
    text(ctx, 'emails, phone numbers, wallets, cards, addresses', CX + 76, PY + 110, { size: 26, color: C.soft })
    const ma = easeOut(prog(t, K.patterns + 0.5, K.patterns + 0.9))
    ctx.save()
    ctx.globalAlpha *= ma
    ctx.strokeStyle = C.warn
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(CX + 36, PY + 150)
    ctx.lineTo(CX + 52, PY + 166)
    ctx.moveTo(CX + 52, PY + 150)
    ctx.lineTo(CX + 36, PY + 166)
    ctx.stroke()
    text(ctx, 'people, companies, places', CX + 76, PY + 168, { size: 26, color: C.soft })
    text(ctx, 'they have no fixed shape', CX + 76 + measure(ctx, 'people, companies, places', { size: 26 }) + 18, PY + 168, { size: 20, family: MONO, color: C.warn })
    ctx.restore()
    const aa = easeOut(prog(t, K.click + 0.2, K.click + 0.7))
    if (aa > 0) {
      ctx.save()
      ctx.globalAlpha *= aa
      ctx.strokeStyle = C.line
      ctx.beginPath()
      ctx.moveTo(CX + 30, PY + 206)
      ctx.lineTo(CX + CW - 30, PY + 206)
      ctx.stroke()
      text(ctx, '+ AI Shield', CX + 30, PY + 254, { size: 26, weight: 600, color: C.eth })
      text(ctx, `a small model that reads like a person, in this browser`, CX + 30 + measure(ctx, '+ AI Shield', { size: 26, weight: 600 }) + 18, PY + 254, {
        size: 22,
        color: C.soft,
      })
      ctx.restore()
    }
    ctx.restore()
  }

  // what the AI sees
  const sa = t >= K.panel[0] ? easeOut(prog(t, K.panel[0], K.panel[0] + 0.5)) : 0
  if (sa > 0) {
    ctx.save()
    ctx.globalAlpha *= sa
    const PY = Y + 150 + (1 - sa) * 16
    panel(ctx, CX, PY, CW, 300, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, 'WHAT THE AI SEES', CX + 30, PY + 50, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    const swap = (i: number) => prog(t, K.panel[0] + 0.5 + i * 0.3, K.panel[0] + 0.85 + i * 0.3)
    MSG.forEach((line, li) => {
      let x = CX + 30
      const y = PY + 112 + li * 54
      line.forEach((seg) => {
        if (seg.hit == null) x += text(ctx, seg.s, x, y, { size: 28, color: C.soft })
        else {
          const p = swap(seg.hit)
          if (p < 1) {
            const w = measure(ctx, seg.s, { size: 28 })
            text(ctx, seg.s, x, y, { size: 28, color: C.ok, alpha: 1 - p })
            if (p > 0) tagPill(ctx, TAGS[seg.hit], x, y, 25, p)
            x += w * (1 - p) + measure(ctx, TAGS[seg.hit], { size: 25, family: MONO }) * p
          } else x += tagPill(ctx, TAGS[seg.hit], x, y, 25) + 4
        }
      })
    })
    const fa = easeOut(prog(t, K.panel[1], K.panel[1] + 0.5))
    text(ctx, 'found on your device in milliseconds · nothing is sent anywhere to find them', CX + 30, PY + 262, {
      size: 16,
      family: MONO,
      color: C.ok,
      alpha: fa,
    })
    ctx.restore()
  }

  // shield bar
  const BY = Y + H - 150
  const by = BY - 28
  const ready = t >= K.ready
  const chipsOn = K.chips.filter((c) => t >= c).length
  if (t >= K.typeStart + 0.2) {
    let x = CX
    shieldIcon(ctx, x + 8, by - 5, 8, C.ok)
    x += 22
    x += text(ctx, 'SHIELD', x, by, { size: 14, family: MONO, color: C.ok, spacing: '0.12em' }) + 14
    x += text(ctx, chipsOn ? `${chipsOn} of ${chipsOn} hidden from the AI` : 'nothing personal found', x, by, { size: 14, family: MONO, color: C.dim }) + 14
    VALUES.slice(0, chipsOn).forEach((v, i) => {
      const ca = easeOut(prog(t, K.chips[i], K.chips[i] + 0.25))
      const pre = 'AI · '
      const label = `${KINDS[i]} · ${v}`
      const pw = measure(ctx, pre, { size: 13, family: MONO })
      const w = pw + measure(ctx, label, { size: 13, family: MONO }) + 20
      ctx.save()
      ctx.globalAlpha *= ca
      ctx.beginPath()
      ctx.roundRect(x, by - 18, w, 26, 6)
      ctx.fillStyle = `rgba(${OK_RGB},0.07)`
      ctx.fill()
      ctx.strokeStyle = `rgba(${OK_RGB},0.35)`
      ctx.lineWidth = 1.2
      ctx.stroke()
      text(ctx, pre, x + 10, by, { size: 13, family: MONO, color: C.eth })
      text(ctx, label, x + 10 + pw, by, { size: 13, family: MONO, color: C.ok })
      ctx.restore()
      x += w + 8
    })

    // the AI switch: off → loading → on
    const loading = t >= K.click && !ready
    const label = !loading && !ready ? '+ AI · 29 MB' : ready ? 'AI ✓' : `AI loading ${Math.round(easeInOut(prog(t, K.click + 0.1, K.ready - 0.1)) * 100)}%`
    const bw = measure(ctx, label, { size: 13, family: MONO }) + 22
    const bx = CX + CW - bw
    ctx.beginPath()
    ctx.roundRect(bx, by - 18, bw, 26, 6)
    ctx.fillStyle = ready ? `rgba(${ETH_RGB},0.1)` : 'rgba(0,0,0,0)'
    ctx.fill()
    if (loading) {
      ctx.save()
      ctx.clip()
      ctx.fillStyle = `rgba(${ETH_RGB},0.16)`
      ctx.fillRect(bx, by - 18, bw * easeInOut(prog(t, K.click + 0.1, K.ready - 0.1)), 26)
      ctx.restore()
    }
    ctx.strokeStyle = ready || loading ? `rgba(${ETH_RGB},0.45)` : C.line2
    ctx.lineWidth = 1.2
    ctx.stroke()
    text(ctx, label, bx + 11, by, { size: 13, family: MONO, color: ready || loading ? C.eth : C.dim })
    if (ready) {
      const ra = 1 - prog(t, K.ready, K.ready + 0.6)
      if (ra > 0) {
        ctx.beginPath()
        ctx.roundRect(bx - 6 * (1 - ra), by - 18 - 6 * (1 - ra), bw + 12 * (1 - ra), 26 + 12 * (1 - ra), 8)
        ctx.strokeStyle = `rgba(${ETH_RGB},${0.6 * ra})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
    // a note under the switch while it loads
    const na = win(t, K.click + 0.1, K.ready + 1.2, 0.3, 0.4)
    if (na) text(ctx, 'downloads once from nullzk.com · then cached', CX + CW, by - 34, { size: 13, family: MONO, color: C.muted, align: 'right', alpha: na })

    // the pointer clicks the switch
    const p0 = { x: CX + 560, y: BY + 120 }
    const p1 = { x: bx + bw / 2 - 4, y: by - 8 }
    const m = easeInOut(prog(t, K.click - 0.8, K.click - 0.1))
    const press = t >= K.click && t < K.click + 0.12 ? 0.9 : 1
    pointer(ctx, p0.x + (p1.x - p0.x) * m, p0.y + (p1.y - p0.y) * m, win(t, K.click - 0.9, K.click + 0.9, 0.2, 0.3) * press)
    const ripple = prog(t, K.click, K.click + 0.5)
    if (ripple > 0 && ripple < 1) {
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 8 + ripple * 26, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${ETH_RGB},${0.6 * (1 - ripple)})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // composer with WEB · IMAGE · SHIELD · COMPARE
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const btn = (bx: number, w: number, label: string, on: boolean) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = on ? `rgba(${OK_RGB},0.08)` : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = on ? `rgba(${OK_RGB},0.4)` : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (on) shieldIcon(ctx, bx + 22, BY + 48, 8, C.ok)
    text(ctx, label, on ? bx + 38 : bx + w / 2, BY + 54, { size: 14, family: MONO, color: on ? C.ok : C.dim, align: on ? 'left' : 'center', spacing: '0.08em' })
  }
  btn(CX + 12, 74, 'WEB', false)
  btn(CX + 94, 92, 'IMAGE', false)
  btn(CX + 194, 112, 'SHIELD', true)
  const TX = CX + 326
  const total = MSG.reduce((n, l) => n + l.reduce((m, s) => m + s.s.length, 0), 0)
  let budget = Math.floor(prog(t, K.typeStart, K.typeEnd) * total)
  if (budget <= 0) text(ctx, 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
  let cx = TX
  let cy = BY + 40
  let widest = 0
  MSG.forEach((line, li) => {
    let x = TX
    const y = BY + 40 + li * 32
    line.forEach((seg) => {
      if (budget <= 0) return
      const take = Math.min(budget, seg.s.length)
      budget -= seg.s.length
      const s = seg.s.slice(0, take)
      const w = text(ctx, s, x, y, { size: 19, color: C.fg })
      if (seg.hit != null && t >= K.chips[seg.hit]) {
        ctx.fillStyle = `rgba(${OK_RGB},0.85)`
        ctx.fillRect(x, y + 5, w * easeOut(prog(t, K.chips[seg.hit], K.chips[seg.hit] + 0.25)), 2)
      }
      x += w
      cx = x
      cy = y
    })
    widest = Math.max(widest, x - TX)
  })
  if (t > K.typeStart && t < K.typeEnd + 1.2 && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(cx + 2, cy - 20, 3, 25)
  }
  // the model reads the message once it is on
  const scan = prog(t, K.ready, K.chips[2] + 0.1)
  if (scan > 0 && scan < 1) {
    const sx = TX + widest * easeInOut(scan)
    const g = ctx.createLinearGradient(sx - 60, 0, sx, 0)
    g.addColorStop(0, `rgba(${ETH_RGB},0)`)
    g.addColorStop(1, `rgba(${ETH_RGB},0.22)`)
    ctx.fillStyle = g
    ctx.fillRect(sx - 60, BY + 14, 60, 68)
    ctx.fillStyle = `rgba(${ETH_RGB},0.9)`
    ctx.fillRect(sx, BY + 14, 2, 68)
  }
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 26, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 57, { size: 24, weight: 600, color: C.bg, align: 'center' })
  text(ctx, 'payment identity hidden · personal details shielded, the model reads the rest', CX + CW / 2, Y + H - 24, {
    size: 13,
    family: MONO,
    color: C.ok,
    align: 'center',
  })
  ctx.restore()
}

/** a node in the "how it runs" diagram */
function node(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: number, label: string, rgb = ETH_RGB) {
  panel(ctx, x, y, w, h, 14, C.panel, lit > 0 ? `rgba(${rgb},${0.15 + 0.35 * lit})` : C.line2)
  if (lit > 0) {
    ctx.save()
    ctx.globalAlpha *= 0.06 * lit
    ctx.fillStyle = `rgb(${rgb})`
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 14)
    ctx.fill()
    ctx.restore()
  }
  text(ctx, label, x + 22, y + 36, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
}

/** a small 4-layer network that lights up column by column */
function net(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pulse: number) {
  const cols = 6
  const rows = [3, 5, 5, 5, 5, 3]
  const pts = rows.map((n, c) => Array.from({ length: n }, (_, r) => ({ x: x + (w * c) / (cols - 1), y: y + h / 2 + (r - (n - 1) / 2) * (h / 5) })))
  const lit = (c: number) => clamp(1 - Math.abs(pulse * (cols + 1) - 1 - c) / 1.2)
  ctx.lineWidth = 1
  for (let c = 0; c < cols - 1; c++) {
    const l = Math.max(lit(c), lit(c + 1))
    ctx.strokeStyle = `rgba(${ETH_RGB},${0.08 + 0.3 * l})`
    ctx.beginPath()
    for (const p of pts[c]) for (const q of pts[c + 1]) {
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
    }
    ctx.stroke()
  }
  pts.forEach((col, c) =>
    col.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = lit(c) > 0.05 ? `rgba(${ETH_RGB},${0.35 + 0.65 * lit(c)})` : C.faint
      ctx.fill()
    }),
  )
}

function packet(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, p: number, rgb: string) {
  if (p <= 0 || p >= 1) return
  const x = x0 + (x1 - x0) * easeInOut(p)
  const g = ctx.createRadialGradient(x, y, 0, x, y, 22)
  g.addColorStop(0, `rgba(${rgb},0.9)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - 22, y - 22, 44, 44)
}

function arrow(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1 - 2, y)
  ctx.moveTo(x1 - 10, y - 6)
  ctx.lineTo(x1 - 2, y)
  ctx.lineTo(x1 - 10, y + 6)
  ctx.stroke()
}

const STATS = [
  { v: '29 MB', k: 'downloads once, then cached' },
  { v: '< 50 ms', k: 'per message, on your CPU' },
  { v: '0', k: 'servers needed to find them' },
]

function howItRuns(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 16.4, AISHIELD_CUES.end, 0.45, 0.45)
  if (!a) return
  const K = AISHIELD_CUES
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HOW IT RUNS', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Everything happens inside your browser.', 960, 216, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })

  // the browser
  const BX = 120
  const BYY = 300
  const BW = 1240
  const BH = 380
  ctx.save()
  ctx.setLineDash([8, 8])
  panel(ctx, BX, BYY, BW, BH, 22, 'rgba(255,255,255,0.012)', `rgba(${OK_RGB},0.4)`)
  ctx.restore()
  text(ctx, 'YOUR BROWSER', BX + 30, BYY + 44, { size: 15, family: MONO, color: C.ok, spacing: '0.16em' })
  text(ctx, 'real names never leave this box', BX + BW - 30, BYY + 44, { size: 15, family: MONO, color: C.dim, align: 'right' })

  const NY = BYY + 90
  const NH = 250
  const cy = NY + NH / 2 + 14
  const hop = (i: number) => prog(t, K.hops[i] - 0.7, K.hops[i])
  const litAt = (at: number) => easeOut(prog(t, at, at + 0.3))

  // 1 · your message
  node(ctx, BX + 40, NY, 330, NH, litAt(16.9), 'YOUR MESSAGE', OK_RGB)
  VALUES.forEach((v, i) => {
    const y = NY + 100 + i * 46
    text(ctx, v, BX + 62, y, { size: 26, weight: 500, color: C.fg })
  })
  text(ctx, '+ the rest of your text', BX + 62, NY + 226, { size: 15, family: MONO, color: C.dim })

  // 2 · the model
  const MX = BX + 450
  node(ctx, MX, NY, 360, NH, litAt(K.hops[0]), 'AI SHIELD MODEL')
  net(ctx, MX + 50, NY + 66, 260, 120, prog(t, K.hops[0], K.hops[1] - 0.6))
  text(ctx, 'BERT · 4 layers · WebAssembly', MX + 180, NY + 226, { size: 15, family: MONO, color: C.muted, align: 'center' })

  // 3 · placeholders
  const PX = BX + 890
  node(ctx, PX, NY, 310, NH, litAt(K.hops[1]), 'PLACEHOLDERS')
  TAGS.forEach((tag, i) => {
    const ta = easeOut(prog(t, K.hops[1] + i * 0.12, K.hops[1] + 0.3 + i * 0.12))
    if (ta > 0) tagPill(ctx, tag, PX + 26, NY + 100 + i * 46, 24, ta)
    else text(ctx, '·····', PX + 26, NY + 100 + i * 46, { size: 24, family: MONO, color: C.faint })
  })

  arrow(ctx, BX + 372, MX - 2, cy, C.line3)
  arrow(ctx, MX + 362, PX - 2, cy, C.line3)
  packet(ctx, BX + 372, MX, cy, hop(0), OK_RGB)
  packet(ctx, MX + 362, PX, cy, hop(1), ETH_RGB)

  // 4 · the AI model out on the internet
  const OX = 1490
  arrow(ctx, PX + 312, OX - 2, cy, `rgba(${ETH_RGB},0.5)`)
  packet(ctx, PX + 312, OX, cy, hop(2), ETH_RGB)
  node(ctx, OX, NY, 310, NH, litAt(K.hops[2]), 'THE AI MODEL')
  text(ctx, 'Claude, GPT, Gemini…', OX + 26, NY + 100, { size: 22, color: C.soft })
  const sa = litAt(K.hops[2])
  text(ctx, 'sees only', OX + 26, NY + 160, { size: 20, color: C.muted, alpha: sa })
  text(ctx, 'placeholders', OX + 26, NY + 192, { size: 20, color: C.eth, alpha: sa })
  if (sa > 0) check(ctx, OX + 270, NY + 182, 16, C.ok, 2.4)

  // stats
  STATS.forEach((s, i) => {
    const pa = easeOut(prog(t, K.stats[i], K.stats[i] + 0.4))
    if (!pa) return
    const x = 120 + i * 570
    const y = 760 - (1 - pa) * 14
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, y, 540, 150, 18, C.panel, C.line2)
    text(ctx, s.v, x + 36, y + 86, { size: 60, weight: 600, spacing: '-2px' })
    text(ctx, s.k, x + 36, y + 124, { size: 18, family: MONO, color: C.muted })
    ctx.restore()
  })
  text(ctx, 'trained on English · other languages work partly · the patterns keep working as before', 960, 960, {
    size: 16,
    family: MONO,
    color: C.dim,
    align: 'center',
    alpha: easeOut(prog(t, K.stats[2] + 0.5, K.stats[2] + 1.0)),
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = AISHIELD_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.07)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'A small AI that guards the big one.', 960, 540, { size: 76, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'AI Shield, live in NULL Chat. Switch it on next to SHIELD.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawAiShield(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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

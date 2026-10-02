// The launch film: 38 s, 16:9. Hook → problem → the cut (∅) → how it works → the product → end card.
// Pure function of time: draw(ctx, w, h, t) renders the frame at t seconds, identically every time.

import { PROJECT } from '../src/config/project'
import {
  C,
  MONO,
  SANS,
  caption,
  check,
  clamp,
  doneDot,
  easeInOut,
  easeOut,
  glow,
  grid,
  measure,
  network,
  nullMark,
  panel,
  prog,
  spinner,
  text,
  vignette,
  win,
  wrap,
} from './kit'

export const DURATION = 38

/** Scene timings (seconds). The soundtrack follows the same cues. */
export const CUE = {
  typeStart: 0.5,
  typeEnd: 3.1,
  problem: 5.0,
  cut: 11.25,
  ringStart: 11.7,
  arrival: 12.6,
  how: 15.5,
  nodes: [16.1, 17.0, 17.9, 18.8, 19.7],
  results: [20.6, 21.0],
  product: 23.0,
  send: 26.2,
  steps: [26.4, 27.0, 27.6, 28.2],
  end: 31.0,
}

const LINE1 = 'Every API call you make'
const LINE2 = 'has your name on it.'

/** When each hook character appears (also used for the typing ticks). */
export function typingTimes(): number[] {
  const n = LINE1.length + LINE2.length
  return Array.from({ length: n }, (_, i) => CUE.typeStart + ((CUE.typeEnd - CUE.typeStart) * i) / (n - 1))
}

// ─── 1 · hook ──────────────────────────────────────────────────────────────

function hook(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0.15, 5.25, 0.4, 0.5)
  if (!a) return
  const o = { size: 92, weight: 500, spacing: '-3.5px' }
  const w1 = measure(ctx, LINE1, o)
  const w2 = measure(ctx, LINE2, o)
  const shown = Math.floor(clamp((t - CUE.typeStart) / (CUE.typeEnd - CUE.typeStart)) * (LINE1.length + LINE2.length - 1) + 1)
  const s1 = LINE1.slice(0, Math.min(shown, LINE1.length))
  const s2 = shown > LINE1.length ? LINE2.slice(0, shown - LINE1.length) : ''
  const x1 = 960 - w1 / 2
  const x2 = 960 - w2 / 2
  text(ctx, s1, x1, 510, { ...o, color: C.fg, alpha: a })
  text(ctx, s2, x2, 616, { ...o, color: C.muted, alpha: a })
  // caret
  const onLine2 = shown > LINE1.length
  const cx = onLine2 ? x2 + measure(ctx, s2, o) + 10 : x1 + measure(ctx, s1, o) + 10
  const cy = onLine2 ? 616 : 510
  if (Math.floor(t * 2.2) % 2 === 0 || t < CUE.typeEnd) {
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = C.eth
    ctx.fillRect(cx, cy - 70, 7, 82)
    ctx.restore()
  }
}

// ─── 2 · the problem ─────────────────────────────────────────────────────────

const IDS = [
  { k: 'WALLET', v: '0x71F…92A' },
  { k: 'CARD', v: '•••• 4242' },
  { k: 'API KEY', v: 'sk-live-…9f2a' },
]
const SVCS = ['CLAUDE', 'GPT', 'ETH RPC', 'WEB SEARCH']
const SVC_Y = [380, 490, 600, 710]

function curvePoint(i: number, p: number) {
  const x0 = 560
  const y0 = 545
  const x1 = 1400
  const y1 = SVC_Y[i] + 32
  const cx = 980
  const u = 1 - p
  // quadratic Bézier with a control point midway, pulled toward the target row
  const qx = u * u * x0 + 2 * u * p * cx + p * p * x1
  const qy = u * u * y0 + 2 * u * p * ((y0 + y1) / 2) + p * p * y1
  return { x: qx, y: qy }
}

function problem(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, CUE.problem, CUE.cut + 0.25, 0.5, 0.25)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  caption(ctx, 'TODAY', 'Every request carries who you are.', 1, C.bad)

  // identity cards
  IDS.forEach((id, i) => {
    const ai = easeOut(prog(t, 5.35 + i * 0.25, 5.85 + i * 0.25))
    if (!ai) return
    const y = 430 + i * 105 - 0
    const x = 200 - (1 - ai) * 30
    ctx.save()
    ctx.globalAlpha *= ai
    panel(ctx, x, y, 360, 84, 12, C.panel2, 'rgba(239,107,107,0.35)')
    text(ctx, id.k, x + 26, y + 34, { size: 16, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, id.v, x + 26, y + 64, { size: 24, family: MONO, color: C.fg })
    ctx.restore()
  })

  // services
  SVCS.forEach((s, i) => {
    const ai = easeOut(prog(t, 6.0 + i * 0.15, 6.5 + i * 0.15))
    if (!ai) return
    const x = 1400 + (1 - ai) * 30
    ctx.save()
    ctx.globalAlpha *= ai
    panel(ctx, x, SVC_Y[i], 320, 64, 12)
    text(ctx, s, x + 26, SVC_Y[i] + 40, { size: 20, family: MONO, color: C.soft, spacing: '0.14em' })
    ctx.restore()
  })

  // links, drawn out from the identity
  const lp = easeInOut(prog(t, 6.6, 7.6))
  if (lp > 0) {
    ctx.save()
    ctx.strokeStyle = 'rgba(239,107,107,0.5)'
    ctx.lineWidth = 2
    for (let i = 0; i < SVCS.length; i++) {
      ctx.beginPath()
      for (let k = 0; k <= 40; k++) {
        const p = (k / 40) * lp
        const pt = curvePoint(i, p)
        if (k === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  // packets carrying the wallet to every service
  if (t > 7.4) {
    for (let i = 0; i < SVCS.length; i++) {
      for (let k = 0; k < 2; k++) {
        const phase = ((t - 7.4) / 1.7 + i * 0.27 + k * 0.5) % 1
        const pt = curvePoint(i, phase)
        const pa = Math.min(1, phase * 6, (1 - phase) * 6)
        ctx.save()
        ctx.globalAlpha *= pa
        ctx.fillStyle = C.bad
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
        ctx.fill()
        if (k === 0) {
          const label = '0x71F…92A'
          const w = measure(ctx, label, { size: 14, family: MONO }) + 18
          ctx.beginPath()
          ctx.roundRect(pt.x - w / 2, pt.y - 38, w, 26, 6)
          ctx.fillStyle = 'rgba(239,107,107,0.12)'
          ctx.fill()
          ctx.strokeStyle = 'rgba(239,107,107,0.45)'
          ctx.lineWidth = 1
          ctx.stroke()
          text(ctx, label, pt.x, pt.y - 20, { size: 14, family: MONO, color: C.bad, align: 'center' })
        }
        ctx.restore()
      }
    }
  }

  const sub = win(t, 8.2, CUE.cut + 0.25, 0.5, 0.25)
  text(ctx, 'Your wallet. Your card. Your API key. Linked to every request.', 960, 930, { size: 26, color: C.muted, align: 'center', alpha: sub })
  ctx.restore()
}

// ─── 3 · the cut ───────────────────────────────────────────────────────────

function cut(ctx: CanvasRenderingContext2D, t: number) {
  // a bright sweep that severs the links
  const sp = prog(t, CUE.cut, CUE.cut + 0.38)
  if (sp > 0 && sp < 1) {
    const x = easeInOut(sp) * 1920
    const g = ctx.createLinearGradient(x - 160, 0, x + 20, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,0.55)')
    ctx.fillStyle = g
    ctx.fillRect(x - 160, 0, 180, 1080)
  }

  const a = win(t, CUE.cut + 0.3, CUE.how + 0.1, 0.3, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const pulse = Math.max(0, 1 - Math.abs(t - CUE.arrival) / 1.4)
  glow(ctx, 960, 450, 520, '138,152,255', 0.05 + 0.13 * pulse)
  const ring = easeInOut(prog(t, CUE.ringStart, CUE.arrival))
  const slash = easeOut(prog(t, CUE.arrival - 0.05, CUE.arrival + 0.4))
  nullMark(ctx, 960, 450, 118, ring, slash, 26)

  const wa = easeOut(prog(t, 13.0, 13.5))
  text(ctx, 'NULL', 960 + 18, 720 - (1 - wa) * 16, { size: 104, weight: 600, family: MONO, align: 'center', spacing: '0.34em', alpha: wa })
  const ta = easeOut(prog(t, 13.6, 14.1))
  const o = { size: 46, weight: 500, spacing: '-1.2px' }
  const w1 = measure(ctx, 'One private balance. ', o)
  const w2 = measure(ctx, 'Every API.', o)
  const x = 960 - (w1 + w2) / 2
  text(ctx, 'One private balance. ', x, 820, { ...o, color: C.fg, alpha: ta })
  text(ctx, 'Every API.', x + w1, 820, { ...o, color: C.muted, alpha: ta })
  ctx.restore()
}

// ─── 4 · how it works ────────────────────────────────────────────────────────

const PIPE = [
  { k: 'WALLET', v: '0x71F…92A' },
  { k: 'PRIVATE DEPOSIT', v: 'note 0x8c1…e4' },
  { k: 'ZK PROOF', v: 'π · 412 ms' },
  { k: 'TEMPORARY KEY', v: 'capped $1.00' },
  { k: 'CLAUDE API', v: '200 OK' },
]
const PIPE_X = [230, 595, 960, 1325, 1690]
const PIPE_Y = 520
const BOUNDARY_X = (PIPE_X[1] + PIPE_X[2]) / 2

function how(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, CUE.how, CUE.product + 0.2, 0.5, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  caption(ctx, 'HOW IT WORKS', 'Fund once. Pay every request with a zero-knowledge proof.', 1)

  // connectors
  for (let i = 0; i < PIPE.length - 1; i++) {
    const lit = t >= CUE.nodes[i + 1]
    ctx.strokeStyle = lit ? C.line3 : C.line
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PIPE_X[i] + 152, PIPE_Y)
    ctx.lineTo(PIPE_X[i + 1] - 152, PIPE_Y)
    ctx.stroke()
  }

  // the identity boundary
  const ba = easeOut(prog(t, 17.4, 17.9))
  if (ba > 0) {
    ctx.save()
    ctx.globalAlpha *= ba
    ctx.setLineDash([8, 8])
    ctx.strokeStyle = 'rgba(138,152,255,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(BOUNDARY_X, 360)
    ctx.lineTo(BOUNDARY_X, 690)
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, 'IDENTITY STOPS HERE', BOUNDARY_X, 342, { size: 16, family: MONO, color: C.eth, align: 'center', spacing: '0.16em' })
    ctx.restore()
  }

  // nodes
  PIPE.forEach((n, i) => {
    const appear = easeOut(prog(t, CUE.how + 0.2 + i * 0.08, CUE.how + 0.7 + i * 0.08))
    const on = t >= CUE.nodes[i]
    const x = PIPE_X[i] - 150
    const y = PIPE_Y - 58
    ctx.save()
    ctx.globalAlpha *= appear
    const zk = n.k === 'ZK PROOF'
    panel(ctx, x, y, 300, 116, 14, zk && on ? '#0d0f1c' : C.panel, on ? (zk ? 'rgba(138,152,255,0.6)' : C.line3) : C.line)
    text(ctx, n.k, x + 24, y + 46, { size: 18, family: MONO, color: on ? C.fg : C.dim, spacing: '0.12em' })
    text(ctx, n.v, x + 24, y + 84, { size: 20, family: MONO, color: on ? C.muted : C.faint })
    if (on) doneDot(ctx, x + 270, y + 30, 13, easeOut(prog(t, CUE.nodes[i], CUE.nodes[i] + 0.25)))
    else if (t > CUE.nodes[i] - 0.9 && i > 0 && t >= CUE.nodes[i - 1]) spinner(ctx, x + 270, y + 30, 11, t)
    ctx.restore()
  })

  // the packet: carries the wallet until the boundary, then only the proof
  const p0 = CUE.nodes[0]
  const p1 = CUE.nodes[4]
  if (t >= p0 && t <= p1 + 0.6) {
    const seg = clamp((t - p0) / ((p1 - p0) / 4), 0, 4)
    const i = Math.min(3, Math.floor(seg))
    const f = easeInOut(seg - i)
    const px = PIPE_X[i] + (PIPE_X[i + 1] - PIPE_X[i]) * f
    const before = px < BOUNDARY_X
    const color = before ? C.eth : C.ok
    const label = before ? '0x71F…92A' : 'π proof'
    const pa = Math.min(1, (p1 + 0.6 - t) / 0.4)
    ctx.save()
    ctx.globalAlpha *= pa
    glow(ctx, px, PIPE_Y, 30, before ? '138,152,255' : '67,211,146', 0.35)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(px, PIPE_Y, 6, 0, Math.PI * 2)
    ctx.fill()
    const w = measure(ctx, label, { size: 16, family: MONO }) + 22
    ctx.beginPath()
    ctx.roundRect(px - w / 2, PIPE_Y + 74, w, 32, 8)
    ctx.fillStyle = before ? 'rgba(138,152,255,0.12)' : 'rgba(67,211,146,0.12)'
    ctx.fill()
    text(ctx, label, px, PIPE_Y + 96, { size: 16, family: MONO, color, align: 'center' })
    ctx.restore()
  }

  // results
  const results = [
    { k: 'PAYMENT IDENTITY', at: CUE.results[0], x: 960 - 330 },
    { k: 'SESSION LINK', at: CUE.results[1], x: 960 + 330 },
  ]
  for (const r of results) {
    const ra = easeOut(prog(t, r.at, r.at + 0.4))
    if (!ra) continue
    ctx.save()
    ctx.globalAlpha *= ra
    const y = 790 - (1 - ra) * 14
    panel(ctx, r.x - 280, y, 560, 92, 14, C.panel2)
    text(ctx, r.k, r.x - 250, y + 54, { size: 18, family: MONO, color: C.dim, spacing: '0.14em' })
    const w = text(ctx, 'HIDDEN', r.x + 160, y + 55, { size: 24, family: MONO, color: C.ok, align: 'right', spacing: '0.12em' })
    check(ctx, r.x + 186, y + 46, 22, C.ok, 3.5)
    void w
    ctx.restore()
  }
  ctx.restore()
}

// ─── 5 · the product ─────────────────────────────────────────────────────────

const PROMPT = 'Explain Ethereum blobs in simple terms.'
const ANSWER =
  'Think of every Ethereum block as a truck with two compartments. The regular one keeps its data forever, so space is expensive. Blobs are a second compartment for rollup data that nodes keep for about 18 days, which makes them far cheaper.'
const STEPS = [
  { k: 'Generating proof...', v: 'π 0x7f3…a1 · groth16 · 412 ms' },
  { k: 'Request authorized...', v: 'temporary key · capped at $1.00' },
  { k: 'Routing privately...', v: 'direct to OpenRouter · claude-sonnet-5.5' },
  { k: 'Response received.', v: '200 OK · 1.18 s' },
]
const REPORT = [
  { k: 'Payment identity', v: 'HIDDEN', good: true },
  { k: 'Persistent API key', v: 'NONE', good: true },
  { k: 'Cross-session billing link', v: 'HIDDEN', good: true },
  { k: 'Request content', v: 'VISIBLE TO PROVIDER', good: false },
  { k: 'Network metadata', v: 'IP VISIBLE · USE TOR', good: false },
]

function product(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, CUE.product, CUE.end + 0.2, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  caption(ctx, '● LIVE ON ETHEREUM MAINNET', 'Claude, GPT and OpenRouter. No account. No API key.', 1, C.ok, 120)

  const rise = (1 - easeOut(prog(t, CUE.product, CUE.product + 0.8))) * 30
  const X = 150
  const Y = 250 + rise
  const W = 1620
  const H = 760
  panel(ctx, X, Y, W, H, 20, C.panel, C.line2)
  // window bar
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(X, Y + 62)
  ctx.lineTo(X + W, Y + 62)
  ctx.stroke()
  text(ctx, `${PROJECT.domain}  /  app  /  playground`, X + 30, Y + 40, { size: 18, family: MONO, color: C.dim })
  const badge = '● MAINNET · LIVE'
  const bw = measure(ctx, badge, { size: 16, family: MONO, spacing: '0.12em' }) + 28
  ctx.beginPath()
  ctx.roundRect(X + W - bw - 28, Y + 17, bw, 30, 6)
  ctx.fillStyle = 'rgba(67,211,146,0.08)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(67,211,146,0.35)'
  ctx.stroke()
  text(ctx, badge, X + W - bw / 2 - 28, Y + 38, { size: 16, family: MONO, color: C.ok, align: 'center', spacing: '0.12em' })

  // left column: balance
  const L = X + 40
  const top = Y + 110
  text(ctx, 'PRIVATE BALANCE', L, top, { size: 16, family: MONO, color: C.dim, spacing: '0.14em' })
  const bal = 0.05 * easeOut(prog(t, CUE.product + 0.6, CUE.product + 1.6))
  const balW = text(ctx, bal.toFixed(4), L, top + 82, { size: 76, weight: 500, spacing: '-3px', color: C.fg })
  text(ctx, 'ETH', L + balW + 14, top + 82, { size: 22, family: MONO, color: C.muted })
  // identity separated badge
  ctx.beginPath()
  ctx.roundRect(L, top + 112, 300, 40, 20)
  ctx.fillStyle = 'rgba(67,211,146,0.07)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(67,211,146,0.3)'
  ctx.stroke()
  text(ctx, 'IDENTITY SEPARATED', L + 24, top + 139, { size: 15, family: MONO, color: C.ok, spacing: '0.12em' })
  check(ctx, L + 274, top + 132, 14, C.ok, 2.5)
  const facts = [
    ['API KEYS ON FILE', 'NONE'],
    ['BILLING ACCOUNTS', 'NONE'],
    ['NOTE EXPIRES IN', '30 days'],
  ]
  facts.forEach(([k, v], i) => {
    const y = top + 220 + i * 62
    ctx.strokeStyle = C.line
    ctx.beginPath()
    ctx.moveTo(L, y + 22)
    ctx.lineTo(L + 360, y + 22)
    ctx.stroke()
    text(ctx, k, L, y, { size: 15, family: MONO, color: C.dim, spacing: '0.12em' })
    text(ctx, v, L + 360, y, { size: 17, family: MONO, color: i < 2 ? C.ok : C.soft, align: 'right' })
  })

  // middle column: the request
  const M = X + 480
  const MW = 660
  panel(ctx, M, top - 28, MW, 96, 12, C.panel2)
  const typed = PROMPT.slice(0, Math.floor(prog(t, 24.8, 26.0) * PROMPT.length))
  text(ctx, typed || 'Ask privately...', M + 24, top + 28, { size: 24, color: typed ? C.fg : C.dim })
  if (t < CUE.send && t > 24.8 && Math.floor(t * 2.4) % 2 === 0) {
    ctx.fillStyle = C.eth
    ctx.fillRect(M + 26 + measure(ctx, typed, { size: 24 }), top + 4, 3, 30)
  }
  // send button
  const pressed = t >= CUE.send && t < CUE.send + 0.25
  ctx.beginPath()
  ctx.roundRect(M, top + 88, 320, 50, 8)
  ctx.fillStyle = pressed ? '#ffffff' : C.fg
  ctx.fill()
  text(ctx, 'SEND PRIVATE REQUEST', M + 160, top + 120, { size: 16, family: MONO, weight: 600, color: C.bg, align: 'center', spacing: '0.12em' })

  // steps
  STEPS.forEach((s, i) => {
    const at = CUE.steps[i]
    const started = t >= (i === 0 ? CUE.send : CUE.steps[i - 1])
    if (!started) return
    const done = t >= at
    const y = top + 186 + i * 56
    if (done) doneDot(ctx, M + 14, y - 8, 12)
    else spinner(ctx, M + 14, y - 8, 10, t)
    text(ctx, s.k, M + 42, y, { size: 19, family: MONO, color: C.fg })
    if (done) text(ctx, s.v, M + 42, y + 24, { size: 15, family: MONO, color: C.muted, alpha: easeOut(prog(t, at, at + 0.3)) })
  })

  // streamed answer
  if (t >= CUE.steps[3]) {
    const by = top + 420
    panel(ctx, M, by, MW, 210, 12, C.panel2)
    text(ctx, 'RESPONSE · anthropic/claude-sonnet-5.5', M + 22, by + 34, { size: 13, family: MONO, color: C.dim, spacing: '0.1em' })
    const chars = Math.floor(prog(t, CUE.steps[3] + 0.1, CUE.steps[3] + 2.4) * ANSWER.length)
    const lines = wrap(ctx, ANSWER.slice(0, chars), MW - 48, { size: 20 })
    lines.slice(0, 5).forEach((ln, i) => text(ctx, ln, M + 22, by + 72 + i * 30, { size: 20, color: C.soft }))
  }

  // right column: privacy report
  const R = X + 1180
  const RW = 400
  text(ctx, 'PRIVACY REPORT', R, top, { size: 16, family: MONO, color: C.dim, spacing: '0.14em' })
  REPORT.forEach((r, i) => {
    const ra = easeOut(prog(t, 28.4 + i * 0.22, 28.7 + i * 0.22))
    const y = top + 52 + i * 84
    ctx.strokeStyle = C.line
    ctx.beginPath()
    ctx.moveTo(R, y + 52)
    ctx.lineTo(R + RW, y + 52)
    ctx.stroke()
    text(ctx, r.k, R, y, { size: 19, color: C.soft, alpha: 0.5 + 0.5 * ra })
    if (ra > 0) {
      const w = text(ctx, r.v, R, y + 32, { size: 16, family: MONO, color: r.good ? C.ok : C.warn, spacing: '0.12em', alpha: ra })
      if (r.good) check(ctx, R + w + 18, y + 26, 13, C.ok, 2.5)
    }
  })
  const sa = easeOut(prog(t, 29.6, 30.0))
  if (sa > 0) {
    const y = top + 52 + 5 * 84 + 6
    text(ctx, 'PRIVACY SCORE', R, y, { size: 15, family: MONO, color: C.dim, spacing: '0.12em', alpha: sa })
    text(ctx, '3 / 5', R + RW, y, { size: 22, family: MONO, color: C.fg, align: 'right', alpha: sa })
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < 3 ? `rgba(67,211,146,${0.8 * sa})` : `rgba(255,255,255,${0.08 * sa})`
      ctx.beginPath()
      ctx.roundRect(R + i * 82, y + 18, 74, 6, 3)
      ctx.fill()
    }
  }
  ctx.restore()
}

// ─── 6 · end card ────────────────────────────────────────────────────────────

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const a = easeOut(prog(t, CUE.end + 0.2, CUE.end + 0.9))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, '138,152,255', 0.08)
  const s = 0.92 + 0.08 * a
  ctx.translate(960, 330)
  ctx.scale(s, s)
  nullMark(ctx, 0, 0, 92, 1, 1, 20)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'NULL', 960 + 20, 580, { size: 118, weight: 600, family: MONO, align: 'center', spacing: '0.34em' })
  const la = easeOut(prog(t, CUE.end + 0.7, CUE.end + 1.3))
  text(ctx, 'Private access to the machine economy.', 960, 660, { size: 40, color: C.muted, align: 'center', spacing: '-0.8px', alpha: la })
  const ma = easeOut(prog(t, CUE.end + 1.2, CUE.end + 1.8))
  const line = 'LIVE ON ETHEREUM MAINNET  ·  BUILT ON zkAPI'
  const lw = measure(ctx, line, { size: 19, family: MONO, spacing: '0.16em' })
  ctx.save()
  ctx.globalAlpha *= ma
  ctx.fillStyle = C.ok
  ctx.beginPath()
  ctx.arc(960 - lw / 2 - 18, 740, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  text(ctx, line, 960 + 6, 747, { size: 19, family: MONO, color: C.soft, align: 'center', spacing: '0.16em', alpha: ma })

  const ba = easeOut(prog(t, CUE.end + 1.8, CUE.end + 2.4))
  const site = PROJECT.domain
  const handle = PROJECT.xHandle
  const o = { size: 30, family: MONO }
  const w1 = measure(ctx, site, o)
  const w2 = measure(ctx, handle, o)
  const gap = 70
  const x0 = 960 - (w1 + gap + w2) / 2
  text(ctx, site, x0, 880, { ...o, color: C.fg, alpha: ba })
  ctx.save()
  ctx.globalAlpha *= ba
  ctx.fillStyle = C.faint
  ctx.fillRect(x0 + w1 + gap / 2 - 1, 856, 2, 30)
  ctx.restore()
  text(ctx, handle, x0 + w1 + gap, 880, { ...o, color: C.muted, alpha: ba })
  if (PROJECT.token.ca) {
    text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 950, { size: 20, family: MONO, color: C.dim, align: 'center', alpha: ba })
  }
  ctx.restore()
}

// ─── the frame ─────────────────────────────────────────────────────────────

export function drawLaunch(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)

  // ambient layers, quieter where text needs the stage
  const gridA = 0.4 + 0.6 * win(t, 0, DURATION + 1, 1.2, 1)
  grid(ctx, gridA)
  const netA = t < CUE.problem ? 0.25 : t < CUE.how ? 0.55 : t < CUE.product ? 0.4 : t < CUE.end ? 0.3 : 0.6
  network(ctx, t, netA * clamp(t / 1.2))

  hook(ctx, t)
  problem(ctx, t)
  cut(ctx, t)
  how(ctx, t)
  product(ctx, t)
  endCard(ctx, t)

  vignette(ctx)
  ctx.restore()
}

export const FONTS_USED = [`500 92px ${SANS}`, `600 104px ${MONO}`, `400 20px ${MONO}`]

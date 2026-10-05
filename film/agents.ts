// "NULL Agent Kit": ~29 s promo. Title → terminal (add an agent with a budget, serve) →
// one agent request through the kit: shielded, paid by proof, tool call filled back in →
// the dashboard with several agents spending cents → end card.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const AGENTS_DURATION = 29

export const AGENTS_CUES = {
  term: [3.1, 11.0],
  cmd1: [3.9, 5.6],
  out1: 5.9,
  cmd2: [7.0, 7.9],
  out2: 8.2,
  flow: [11.1, 19.4],
  hops: [11.8, 13.0, 14.2, 15.4, 16.6],
  dash: [19.2, 23.9],
  end: 23.9,
}

const ETH_RGB = '138,152,255'
const OK_RGB = '67,211,146'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.09)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'NULL Agent Kit', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Private money for AI agents.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

// ── terminal ────────────────────────────────────────────────────────────────

const CMD1 = 'node null-agent.mjs add research-bot --budget 2 --models claude,grok'
const OUT1 = [
  ['agent   ', 'research-bot', C.fg],
  ['key     ', 'nk_7Fq2xVb9…d3K', C.eth],
  ['budget  ', '$2 per day (UTC)', C.fg],
]
const CMD2 = 'node null-agent.mjs serve'
const OUT2 = [
  ['∅ NULL Agent Kit 0.1.0', '', C.fg],
  ['API        ', 'http://127.0.0.1:8788/v1   (OpenAI-compatible)', C.soft],
  ['dashboard  ', 'http://127.0.0.1:8788', C.soft],
  ['upstream   ', 'zkapi-clientd · paid privately', C.ok],
]

function terminal(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, AGENTS_CUES.term[0], AGENTS_CUES.term[1], 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 260
  const Y = 170 + (1 - easeOut(prog(t, 3.1, 3.9))) * 30
  const W = 1400
  const H = 740
  panel(ctx, X, Y, W, H, 18, '#08080a', C.line2)
  ;['#ef6b6b', '#e0b45e', '#43d392'].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.globalAlpha = a * 0.7
    ctx.beginPath()
    ctx.arc(X + 30 + i * 22, Y + 28, 6, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = a
  text(ctx, '~/agents', X + W / 2, Y + 34, { size: 15, family: MONO, color: C.dim, align: 'center' })
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(X, Y + 56)
  ctx.lineTo(X + W, Y + 56)
  ctx.stroke()

  const L = X + 44
  let y = Y + 120
  const typed = (cmd: string, span: number[]) => {
    const n = Math.floor(prog(t, span[0], span[1]) * cmd.length)
    text(ctx, '$', L, y, { size: 24, family: MONO, color: C.ok })
    const w = text(ctx, cmd.slice(0, n), L + 30, y, { size: 24, family: MONO, color: C.fg })
    if (t < span[1] + 0.3 && t > span[0] - 0.4 && Math.floor(t * 2.4) % 2 === 0) {
      ctx.fillStyle = C.eth
      ctx.fillRect(L + 32 + w, y - 22, 12, 28)
    }
  }
  typed(CMD1, AGENTS_CUES.cmd1)
  y += 60
  OUT1.forEach(([k, v, c], i) => {
    const oa = easeOut(prog(t, AGENTS_CUES.out1 + i * 0.12, AGENTS_CUES.out1 + i * 0.12 + 0.25))
    if (!oa) return
    const kw = text(ctx, k, L + 30, y + i * 40, { size: 22, family: MONO, color: C.dim, alpha: oa })
    text(ctx, v, L + 30 + kw, y + i * 40, { size: 22, family: MONO, color: c, alpha: oa })
  })
  y += 3 * 40 + 50
  if (t >= AGENTS_CUES.cmd2[0] - 0.3) {
    typed(CMD2, AGENTS_CUES.cmd2)
    y += 60
    OUT2.forEach(([k, v, c], i) => {
      const oa = easeOut(prog(t, AGENTS_CUES.out2 + i * 0.12, AGENTS_CUES.out2 + i * 0.12 + 0.25))
      if (!oa) return
      const kw = text(ctx, k, L + 30, y + i * 40, { size: 22, family: MONO, color: i === 0 ? C.fg : C.dim, alpha: oa })
      text(ctx, v, L + 30 + kw, y + i * 40, { size: 22, family: MONO, color: c, alpha: oa })
    })
  }
  ctx.restore()
}

// ── one request through the kit ─────────────────────────────────────────────

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, head: string, sub: string, lit: number, rgb = ETH_RGB) {
  panel(ctx, x, y, w, h, 14, C.panel, lit > 0 ? `rgba(${rgb},${0.25 + 0.45 * lit})` : C.line2)
  if (lit > 0) glow(ctx, x + w / 2, y + h / 2, 140, rgb, 0.12 * lit)
  text(ctx, head, x + 22, y + 40, { size: 19, family: MONO, color: lit > 0 ? `rgb(${rgb})` : C.fg, spacing: '0.06em' })
  text(ctx, sub, x + 22, y + 72, { size: 15, family: MONO, color: C.dim })
}

function line(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, tagColor = C.eth, base = C.soft) {
  // draws text where [TAGS] are colored and real details marked with ⟨⟩ are green
  let cx = x
  for (const part of s.split(/(\[[A-Z]+_\d\]|⟨[^⟩]+⟩)/)) {
    if (!part) continue
    if (part.startsWith('[')) cx += text(ctx, part, cx, y, { size, family: MONO, color: tagColor })
    else if (part.startsWith('⟨')) cx += text(ctx, part.slice(1, -1), cx, y, { size, family: MONO, color: C.ok })
    else cx += text(ctx, part, cx, y, { size, family: MONO, color: base })
  }
  return cx - x
}

function flow(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, AGENTS_CUES.flow[0], AGENTS_CUES.flow[1], 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'ONE AGENT REQUEST', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  const [h0, h1, h2, h3, h4] = AGENTS_CUES.hops
  const lit = (at: number) => clamp(1 - Math.abs(t - at - 0.4) / 0.9)
  const Y = 230
  const BW = 280
  const BH = 100
  const xs = [150, 485, 820, 1155, 1490]
  box(ctx, xs[0], Y, BW, BH, 'research-bot', 'your agent · nk_ key', lit(h0))
  box(ctx, xs[1], Y, BW, BH, 'NULL AGENT KIT', 'budget · shield', lit(h1))
  box(ctx, xs[2], Y, BW, BH, 'zkapi-clientd', 'proof · fresh key', lit(h2), OK_RGB)
  box(ctx, xs[3], Y, BW, BH, 'Tor', 'hides your IP', lit(h3), OK_RGB)
  box(ctx, xs[4], Y, BW, BH, 'Claude', 'via OpenRouter', lit(h4))
  // arrows
  ctx.strokeStyle = C.line3
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const x0 = xs[i] + BW + 8
    const x1 = xs[i + 1] - 8
    ctx.beginPath()
    ctx.moveTo(x0, Y + BH / 2)
    ctx.lineTo(x1, Y + BH / 2)
    ctx.stroke()
  }
  // the packet
  const p = prog(t, h0, h4 + 0.4)
  if (p > 0 && p < 1) {
    const x = xs[0] + BW / 2 + (xs[4] - xs[0]) * easeInOut(p)
    glow(ctx, x, Y - 26, 40, ETH_RGB, 0.4)
    ctx.fillStyle = C.eth
    ctx.beginPath()
    ctx.roundRect(x - 18, Y - 36, 36, 20, 6)
    ctx.fill()
  }

  // what the agent sent vs what the provider saw
  const PY = 420
  const sa = easeOut(prog(t, h0, h0 + 0.5))
  if (sa > 0) {
    ctx.save()
    ctx.globalAlpha *= sa
    panel(ctx, 140, PY, 800, 220, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, 'THE AGENT SENT', 170, PY + 44, { size: 15, family: MONO, color: C.dim, spacing: '0.14em' })
    line(ctx, 'Email my landlord ⟨Anna Becker⟩ at', 170, PY + 100, 22)
    line(ctx, '⟨anna.becker@gmx.de⟩ that I move out', 170, PY + 140, 22)
    line(ctx, 'of ⟨Lindenstraße 12⟩ in May.', 170, PY + 180, 22)
    ctx.restore()
  }
  const pa = easeOut(prog(t, h1 + 0.3, h1 + 0.9))
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, 980, PY, 800, 220, 16, 'rgba(255,255,255,0.02)', `rgba(${ETH_RGB},0.35)`)
    text(ctx, 'THE PROVIDER SAW', 1010, PY + 44, { size: 15, family: MONO, color: C.eth, spacing: '0.14em' })
    line(ctx, 'Email my landlord [NAME_1] at', 1010, PY + 100, 22)
    line(ctx, '[EMAIL_1] that I move out', 1010, PY + 140, 22)
    line(ctx, 'of [ADDRESS_1] in May.', 1010, PY + 180, 22)
    ctx.restore()
  }
  // the tool call coming back, filled back in
  const ra = easeOut(prog(t, h4 + 0.6, h4 + 1.1))
  if (ra > 0) {
    ctx.save()
    ctx.globalAlpha *= ra
    const RY = 690
    panel(ctx, 140, RY, 1640, 230, 16, 'rgba(255,255,255,0.02)', `rgba(${OK_RGB},0.35)`)
    text(ctx, 'BACK AT YOUR AGENT · TOOL CALL', 170, RY + 44, { size: 15, family: MONO, color: C.ok, spacing: '0.14em' })
    const m = prog(t, h4 + 1.2, h4 + 1.8)
    const to = m < 0.5 ? '[EMAIL_1]' : '⟨anna.becker@gmx.de⟩'
    const nm = m < 0.5 ? '[NAME_1]' : '⟨Anna Becker⟩'
    line(ctx, `send_email({ to: "${to}", name: "${nm}" })`, 170, RY + 104, 26)
    const ma = easeOut(prog(t, h4 + 1.8, h4 + 2.3))
    if (ma > 0) {
      ctx.save()
      ctx.globalAlpha *= ma
      const meta = 'claude · 2.9s · 0.21¢ · budget $1.79 left today · '
      text(ctx, meta, 170, RY + 170, { size: 18, family: MONO, color: C.dim })
      const w = measure(ctx, meta, { size: 18, family: MONO })
      text(ctx, 'paid by proof', 170 + w, RY + 170, { size: 18, family: MONO, color: C.ok })
      check(ctx, 170 + w + measure(ctx, 'paid by proof', { size: 18, family: MONO }) + 16, RY + 164, 13, C.ok, 2.2)
      ctx.restore()
    }
    ctx.restore()
  }
  ctx.restore()
}

// ── dashboard ───────────────────────────────────────────────────────────────

const AGENTS = [
  { name: 'research-bot', budget: 2, spent: 0.21, total: 0.94, req: 41, shield: 'on' },
  { name: 'inbox-helper', budget: 1, spent: 0.38, total: 2.12, req: 117, shield: 'on' },
  { name: 'trading-notes', budget: 0.5, spent: 0.07, total: 0.31, req: 18, shield: 'on' },
  { name: 'code-review', budget: 3, spent: 1.26, total: 6.4, req: 202, shield: 'off' },
]

function dashboard(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, AGENTS_CUES.dash[0], AGENTS_CUES.dash[1], 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const X = 200
  const Y = 160 + (1 - easeOut(prog(t, AGENTS_CUES.dash[0], AGENTS_CUES.dash[0] + 0.8))) * 24
  const W = 1520
  panel(ctx, X, Y, W, 760, 18, '#08080a', C.line2)
  text(ctx, '∅ NULL · AGENT KIT', X + 50, Y + 70, { size: 24, family: MONO, weight: 600, spacing: '0.18em' })
  text(ctx, 'http://127.0.0.1:8788 · paid privately via zkAPI · nothing here leaves this machine', X + 50, Y + 108, { size: 16, family: MONO, color: C.muted })
  const cols = [X + 50, X + 400, X + 820, X + 1040, X + 1240]
  const heads = ['AGENT', 'TODAY', 'TOTAL', 'REQUESTS', 'SHIELD']
  heads.forEach((h, i) => text(ctx, h, cols[i], Y + 190, { size: 14, family: MONO, color: C.dim, spacing: '0.14em' }))
  AGENTS.forEach((ag, i) => {
    const ra = easeOut(prog(t, AGENTS_CUES.dash[0] + 0.5 + i * 0.25, AGENTS_CUES.dash[0] + 0.9 + i * 0.25))
    if (!ra) return
    const y = Y + 260 + i * 110
    ctx.save()
    ctx.globalAlpha *= ra
    ctx.strokeStyle = C.line
    ctx.beginPath()
    ctx.moveTo(X + 40, y - 46)
    ctx.lineTo(X + W - 40, y - 46)
    ctx.stroke()
    text(ctx, ag.name, cols[0], y, { size: 22, family: MONO, color: C.fg })
    const grow = easeOut(prog(t, AGENTS_CUES.dash[0] + 0.9 + i * 0.25, AGENTS_CUES.dash[0] + 2.4 + i * 0.25))
    const spent = ag.spent * grow
    const sw = text(ctx, `$${spent.toFixed(2)}`, cols[1], y, { size: 22, family: MONO, color: C.fg })
    text(ctx, ` of $${ag.budget}`, cols[1] + sw, y, { size: 18, family: MONO, color: C.dim })
    ctx.fillStyle = C.line2
    ctx.fillRect(cols[1], y + 16, 260, 5)
    ctx.fillStyle = C.eth
    ctx.fillRect(cols[1], y + 16, 260 * Math.min(1, spent / ag.budget), 5)
    text(ctx, `$${(ag.total - ag.spent + spent).toFixed(2)}`, cols[2], y, { size: 22, family: MONO, color: C.soft })
    text(ctx, String(Math.round(ag.req * (0.8 + 0.2 * grow))), cols[3], y, { size: 22, family: MONO, color: C.soft })
    text(ctx, ag.shield, cols[4], y, { size: 22, family: MONO, color: ag.shield === 'on' ? C.ok : C.dim })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const a = easeOut(prog(t, AGENTS_CUES.end + 0.1, AGENTS_CUES.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.08)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Give your agents a private wallet.', 960, 540, { size: 76, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'A key and a budget per agent · Prompt Shield · paid by proof', 960, 610, { size: 30, color: C.muted, align: 'center' })
  text(ctx, `${PROJECT.domain}/agents`, 960, 730, { size: 40, family: MONO, color: C.fg, align: 'center' })
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

export function drawAgents(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  terminal(ctx, t)
  flow(ctx, t)
  dashboard(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}



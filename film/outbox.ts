// "Outbox": ~27 s promo. Title → a message with a name and a number is answered → "what was sent"
// opens the Outbox: every request, the answer request unfolded with its masked key and the
// placeholders in its body → the request word for word, and what is not in it → three points →
// end card. The message and placeholders are what NULL Chat produced in the test.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, text, win } from './kit'

export const OUTBOX_DURATION = 27

export const OUTBOX_CUES = {
  send: 4.6,
  answer: 5.6,
  click: 8.4,
  open: 8.7,
  rows: [9.2, 9.45, 9.7],
  unfold: 10.4,
  tags: 12.2,
  word: [14.4, 20.2],
  notIn: [16.6, 17.2, 17.8],
  points: [20.8, 21.2, 21.6],
  end: 24.4,
}

const ETH_RGB = '138,152,255'
const OK_RGB = '67,211,146'
const OUT = new Path2D('m18 9-6-6-6 6 M12 3v14 M5 21h14')

const Q = 'Write a short email to my landlord Jonas Weber. My number is +49 151 2345 6789.'
const Q_WIRE = 'Write a short email to my landlord [NAME_1]. My number is [PHONE_1].'
const ANSWER = ['Hi Jonas Weber,', 'Thanks for getting back to me so quickly.', 'You can reach me any time at +49 151 2345 6789.']
const ROWS = [
  { t: '21:04:12', what: 'answer request · anthropic/claude-sonnet-5.5', url: 'POST openrouter.ai/api/v1/chat/completions', size: '1.2 KB', status: '200 · 2140 ms', answer: true },
  { t: '21:04:11', what: 'zkAPI: proof, key or config', url: 'POST nullzk.com/zkapi-deployment/…', size: '2.4 KB', status: '200 · 380 ms' },
  { t: '21:03:58', what: 'public vault stats (Blockscout)', url: 'GET eth.blockscout.com/api/v2/addresses/•••/logs', size: '—', status: '200 · 190 ms' },
]
const BODY = [
  '{',
  '  "model": "anthropic/claude-sonnet-5.5",',
  '  "stream": true,',
  '  "messages": [',
  '    { "role": "system", "content": "You are a helpful assistant…" },',
  '    { "role": "user",',
  `      "content": "${Q_WIRE}" }`,
  '  ]',
  '}',
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

/** mono text where [TAGS] glow green, with an optional highlight strength */
function tagged(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, glowA = 0) {
  let cx = x
  for (const part of s.split(/(\[[A-Z]+_\d+\])/)) {
    if (!part) continue
    if (/^\[[A-Z]+_\d+\]$/.test(part)) {
      const w = measure(ctx, part, { size, family: MONO })
      ctx.fillStyle = `rgba(${OK_RGB},${0.1 + 0.18 * glowA})`
      ctx.beginPath()
      ctx.roundRect(cx - 3, y - size * 0.88, w + 6, size * 1.22, 4)
      ctx.fill()
      cx += text(ctx, part, cx, y, { size, family: MONO, color: C.ok })
    } else cx += text(ctx, part, cx, y, { size, family: MONO, color })
  }
}

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, OK_RGB, 0.07)
  icon(ctx, OUT, 960, 410, 130 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Outbox', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'See exactly what left your browser.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = OUTBOX_CUES
  const a = win(t, 3.1, K.word[0] + 0.2, 0.5, 0.45)
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
  // header: the outbox button with its count
  const n = t < K.send + 0.3 ? 1 : 3
  panel(ctx, X + W - 360, Y + 20, 150, 40, 20, C.panel, C.line2)
  icon(ctx, OUT, X + W - 336, Y + 40, 16, C.dim, 2)
  text(ctx, 'OUTBOX', X + W - 318, Y + 46, { size: 14, family: MONO, color: C.dim, spacing: '0.12em' })
  text(ctx, String(n), X + W - 232, Y + 46, { size: 14, family: MONO, color: C.soft })
  panel(ctx, X + W - 194, Y + 22, 70, 36, 18, C.panel, `rgba(${OK_RGB},0.35)`)
  text(ctx, 'LIVE', X + W - 159, Y + 45, { size: 13, family: MONO, color: C.ok, align: 'center', spacing: '0.12em' })
  panel(ctx, X + W - 110, Y + 20, 82, 40, 8, C.fg, C.fg)
  text(ctx, 'WALLET', X + W - 69, Y + 45, { size: 12, family: MONO, color: C.bg, align: 'center', spacing: '0.08em' })

  // the chat
  const CX = X + 260
  const CW = 1160
  const qa = easeOut(prog(t, K.send, K.send + 0.4))
  if (qa > 0) {
    ctx.save()
    ctx.globalAlpha *= qa
    const qw = measure(ctx, Q, { size: 20 }) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 130, qw, 50, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, Q, CX + CW - qw + 22, Y + 162, { size: 20, color: C.fg })
    check(ctx, CX + CW - 258, Y + 205, 11, C.ok, 2)
    text(ctx, '2 hidden from the AI · show what it saw', CX + CW, Y + 210, { size: 14, family: MONO, color: C.ok, align: 'right' })
    ctx.restore()
  }
  let linkAt: { x: number; y: number } | null = null
  if (t >= K.answer) {
    panel(ctx, CX, Y + 250, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, Y + 270, 8, 1, 1, 2.5)
    ANSWER.forEach((l, i) => text(ctx, l, CX + 70, Y + 278 + i * 44, { size: 23, color: C.soft, alpha: easeOut(prog(t, K.answer + i * 0.25, K.answer + 0.3 + i * 0.25)) }))
    const ma = easeOut(prog(t, K.answer + 0.9, K.answer + 1.3))
    ctx.save()
    ctx.globalAlpha *= ma
    let mx = CX + 70
    const my = Y + 278 + ANSWER.length * 44 + 8
    mx += text(ctx, 'Claude Sonnet 5.5 · 2.1s · shield · ', mx, my, { size: 15, family: MONO, color: C.dim })
    mx += text(ctx, 'paid by proof ✓', mx, my, { size: 15, family: MONO, color: C.ok })
    mx += text(ctx, ' · ', mx, my, { size: 15, family: MONO, color: C.dim })
    const hot = t > K.click - 0.6 && t < K.click + 0.5
    icon(ctx, OUT, mx + 8, my - 5, 14, hot ? C.fg : C.dim, 2)
    text(ctx, 'what was sent', mx + 22, my, { size: 15, family: MONO, color: hot ? C.fg : C.dim })
    ctx.restore()
    linkAt = { x: mx + 70, y: my - 5 }
  }

  // composer
  panel(ctx, CX, Y + 790, CW, 70, 14, C.panel2, C.line3)
  const typed = t < K.send ? Q.slice(0, Math.floor(prog(t, 3.4, K.send - 0.2) * Q.length)) : ''
  if (typed) text(ctx, typed, CX + 24, Y + 833, { size: 20, color: C.fg })
  else text(ctx, 'Ask privately…', CX + 24, Y + 833, { size: 20, color: C.dim })

  // the outbox dialog
  const d = easeOut(prog(t, K.open, K.open + 0.35))
  if (d > 0) {
    ctx.fillStyle = `rgba(3,3,4,${0.72 * d})`
    ctx.fillRect(X, Y, W, 900)
    ctx.save()
    ctx.globalAlpha *= d
    const DX = X + 240
    const DY = Y + 50 + (1 - d) * 16
    const DW = 1200
    panel(ctx, DX, DY, DW, 836, 16, C.panel, C.line2)
    text(ctx, 'PRIVACY · OUTBOX', DX + 36, DY + 46, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, 'What left this browser', DX + 36, DY + 82, { size: 26, weight: 500 })
    // summary cards
    const cards = [
      { k: 'REQUESTS', v: '3', s: 'openrouter.ai · nullzk.com · blockscout', rgb: '' },
      { k: 'ANSWER REQUESTS', v: '1', s: 'paid by proof, no wallet in them', rgb: ETH_RGB },
      { k: 'SENT AS PLACEHOLDERS', v: '2', s: '[NAME_1] [PHONE_1]', rgb: OK_RGB },
    ]
    cards.forEach((c, i) => {
      const x = DX + 36 + i * 380
      panel(ctx, x, DY + 110, 364, 104, 10, c.rgb ? `rgba(${c.rgb},0.04)` : 'rgba(255,255,255,0.02)', c.rgb ? `rgba(${c.rgb},0.3)` : C.line2)
      text(ctx, c.k, x + 18, DY + 138, { size: 12, family: MONO, color: C.dim, spacing: '0.14em' })
      const glowTags = i === 2 ? easeOut(prog(t, K.tags, K.tags + 0.4)) : 0
      text(ctx, c.v, x + 18, DY + 178, { size: 32, weight: 500, color: i === 2 ? C.ok : C.fg })
      if (i === 2) tagged(ctx, c.s, x + 18, DY + 202, 13, C.dim, glowTags)
      else text(ctx, c.s, x + 18, DY + 202, { size: 13, family: MONO, color: C.dim })
    })
    // rows
    let ry = DY + 240
    ROWS.forEach((r, i) => {
      const ra = easeOut(prog(t, K.rows[i], K.rows[i] + 0.3))
      if (!ra) return
      const open = r.answer ? easeOut(prog(t, K.unfold, K.unfold + 0.5)) : 0
      const h = 74 + open * 330
      ctx.save()
      ctx.globalAlpha *= ra
      panel(ctx, DX + 36, ry, DW - 72, h, 10, r.answer ? `rgba(${ETH_RGB},0.04)` : 'rgba(255,255,255,0.02)', r.answer ? `rgba(${ETH_RGB},0.3)` : C.line2)
      text(ctx, r.t, DX + 54, ry + 30, { size: 13, family: MONO, color: C.dim })
      text(ctx, r.what, DX + 150, ry + 30, { size: 17, color: r.answer ? C.fg : C.soft })
      text(ctx, r.url, DX + 150, ry + 56, { size: 13, family: MONO, color: C.dim })
      text(ctx, r.size, DX + DW - 56, ry + 30, { size: 13, family: MONO, color: C.dim, align: 'right' })
      text(ctx, r.status, DX + DW - 56, ry + 52, { size: 13, family: MONO, color: C.dim, align: 'right' })
      if (open > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(DX + 36, ry, DW - 72, h)
        ctx.clip()
        tagged(ctx, 'sent as placeholders: [NAME_1] [PHONE_1]', DX + 150, ry + 82, 13, C.ok, easeOut(prog(t, K.tags, K.tags + 0.4)))
        text(ctx, 'authorization: Bearer •••• (masked)', DX + 54, ry + 122, { size: 13, family: MONO, color: C.dim })
        text(ctx, 'content-type: application/json', DX + 54, ry + 142, { size: 13, family: MONO, color: C.dim })
        panel(ctx, DX + 54, ry + 156, DW - 108, 236, 6, C.bg, C.line)
        BODY.forEach((l, k) => tagged(ctx, l, DX + 72, ry + 182 + k * 25, 14, C.muted, easeOut(prog(t, K.tags, K.tags + 0.4))))
        ctx.restore()
      }
      ctx.restore()
      ry += h + 10
    })
    ctx.restore()
  }

  // pointer: to "what was sent"
  if (linkAt) {
    const e = easeInOut(prog(t, K.click - 1.0, K.click - 0.1))
    pointer(ctx, 1150 + (linkAt.x - 1150) * e, 760 + (linkAt.y - 760) * e, win(t, K.click - 1.1, K.click + 0.4, 0.2, 0.25))
    const r = prog(t, K.click, K.click + 0.45)
    if (r > 0 && r < 1) {
      ctx.beginPath()
      ctx.arc(linkAt.x, linkAt.y, 8 + r * 26, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${OK_RGB},${0.6 * (1 - r)})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** the request word for word, and what is not in it */
function word(ctx: CanvasRenderingContext2D, t: number) {
  const K = OUTBOX_CUES
  const a = win(t, K.word[0], K.word[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'THE ANSWER REQUEST, WORD FOR WORD', 960, 170, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Your landlord got a placeholder.', 960, 240, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  panel(ctx, 160, 320, 1600, 170, 16, C.panel, `rgba(${ETH_RGB},0.3)`)
  text(ctx, '"role": "user", "content":', 200, 380, { size: 22, family: MONO, color: C.dim })
  tagged(ctx, `"${Q_WIRE}"`, 200, 436, 26, C.fg, 0.6 + 0.4 * Math.sin(t * 3) ** 2)

  const NOT = ['your landlord’s name', 'your phone number', 'your wallet or account']
  text(ctx, 'NOT IN IT', 200, 580, { size: 16, family: MONO, color: C.muted, spacing: '0.16em' })
  NOT.forEach((s, i) => {
    const na = easeOut(prog(t, K.notIn[i], K.notIn[i] + 0.35))
    if (!na) return
    const x = 200 + i * 520
    ctx.save()
    ctx.globalAlpha *= na
    panel(ctx, x, 610, 480, 110, 14, `rgba(${OK_RGB},0.04)`, `rgba(${OK_RGB},0.3)`)
    check(ctx, x + 40, 665, 18, C.ok, 2.8)
    text(ctx, s, x + 72, 673, { size: 24, color: C.fg })
    ctx.restore()
  })
  text(ctx, 'Open it yourself: every request in this tab, keys masked, nothing saved.', 960, 820, { size: 22, family: MONO, color: C.muted, align: 'center', alpha: easeOut(prog(t, K.notIn[2] + 0.6, K.notIn[2] + 1.0)) })
  ctx.restore()
}

const POINTS = [
  { k: 'EVERY REQUEST', v: 'where it went, how big' },
  { k: 'WORD FOR WORD', v: 'the exact body, keys masked' },
  { k: 'NOTHING SAVED', v: 'reload and it’s gone' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const K = OUTBOX_CUES
  const a = win(t, 20.4, K.end, 0.4, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, K.points[i] - 0.3, K.points[i] + 0.1))
    if (!pa) return
    const x = 120 + i * 570
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, 420 - (1 - pa) * 14, 540, 220, 18, C.panel, `rgba(${OK_RGB},0.3)`)
    text(ctx, p.k, x + 36, 486, { size: 16, family: MONO, color: C.ok, spacing: '0.16em' })
    text(ctx, p.v, x + 36, 566, { size: 30, color: C.fg })
    ctx.restore()
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = OUTBOX_CUES
  const a = easeOut(prog(t, K.end - 0.2, K.end + 0.5))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  icon(ctx, OUT, 960, 320, 110, C.fg, 2)
  text(ctx, 'Don’t trust. Verify.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Outbox, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawOutbox(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  word(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

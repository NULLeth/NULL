// "Ghost Chats": ~26 s promo. Title → where chats usually live → GHOST on, a private health
// question, an answer → GHOST · LEAVE: the chat dissolves → what is left (nothing) → auto-delete
// for normal chats → end card. The "nothing left" checks are what the browser test showed.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, seeded, spinner, text, win } from './kit'

export const GHOST_DURATION = 26

export const GHOST_CUES = {
  where: [3.2, 6.6],
  ghostOn: 7.4,
  typeStart: 8.0,
  typeEnd: 9.4,
  send: 9.7,
  streamStart: 10.3,
  streamEnd: 12.6,
  leave: 13.6,
  dissolve: [13.7, 15.0],
  checks: [15.3, 15.6, 15.9],
  auto: [17.4, 22.0],
  pick: 18.6,
  gone: [19.2, 19.6],
  end: 22.4,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const BAD_RGB = '239,107,107'
const Q = 'My blood test shows high cholesterol. What should I eat?'
const ANSWER = [
  'Small swaps help most: oats or beans on most days,',
  'nuts instead of chips, olive oil instead of butter,',
  'and fish twice a week. Talk to your doctor before',
  'you change any medication.',
]
const GHOST = new Path2D('M9 10v1 M15 10v1 M7.528 20.472a1.6 1.6 0 0 1 2.277 0l1.057 1.056a1.6 1.6 0 0 0 2.276 0l1.057-1.056a1.6 1.6 0 0 1 2.277 0l1.114 1.114a1.4 1.4 0 0 0 2.414-1V10a8 8 0 0 0-16 0v10.586a1.4 1.4 0 0 0 2.414 1z')

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

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, ETH_RGB, 0.08)
  icon(ctx, GHOST, 960, 420, 150 * easeOut(prog(t, 0.2, 1.0)) + 1, C.fg, 2)
  text(ctx, 'Ghost Chats', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Ask, and leave no trace. Not even in your browser.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

/** where chats usually live, and where a ghost chat lives */
function where(ctx: CanvasRenderingContext2D, t: number) {
  const K = GHOST_CUES
  const a = win(t, K.where[0], K.where[1], 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHERE YOUR CHATS LIVE', 960, 250, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  const rows = [
    { k: 'Most AI apps', v: 'on their servers, often for good', ok: false, at: K.where[0] + 0.4 },
    { k: 'NULL Chat', v: 'never on a server, only in your browser', ok: true, at: K.where[0] + 1.0 },
    { k: 'Ghost chat', v: 'nowhere at all', ok: true, at: K.where[0] + 1.6, ghost: true },
  ]
  rows.forEach((r, i) => {
    const ra = easeOut(prog(t, r.at, r.at + 0.4))
    if (!ra) return
    const y = 380 + i * 150 - (1 - ra) * 14
    ctx.save()
    ctx.globalAlpha *= ra
    panel(ctx, 360, y - 64, 1200, 120, 18, C.panel, r.ghost ? `rgba(${ETH_RGB},0.45)` : r.ok ? `rgba(${OK_RGB},0.25)` : `rgba(${BAD_RGB},0.25)`)
    if (r.ghost) icon(ctx, GHOST, 430, y - 4, 40, C.eth, 2)
    else if (r.ok) check(ctx, 430, y - 4, 26, C.ok, 3)
    else {
      ctx.strokeStyle = C.bad
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(418, y - 16)
      ctx.lineTo(442, y + 8)
      ctx.moveTo(442, y - 16)
      ctx.lineTo(418, y + 8)
      ctx.stroke()
    }
    text(ctx, r.k, 480, y + 6, { size: 36, weight: 600, spacing: '-1px', color: r.ghost ? C.eth : C.fg })
    text(ctx, r.v, 1520, y + 6, { size: 26, color: C.muted, align: 'right' })
    ctx.restore()
  })
  ctx.restore()
}

/** text that turns to drifting dust as `p` goes 0 → 1 */
function dust(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, seed: number) {
  if (p <= 0 || p >= 1) return
  const rnd = seeded(seed)
  for (let i = 0; i < 220; i++) {
    const px = x + rnd() * w
    const py = y + rnd() * h
    const delay = (px - x) / w * 0.5
    const q = clamp((p - delay) / 0.5)
    if (q <= 0 || q >= 1) continue
    const dx = (rnd() - 0.3) * 120 * q
    const dy = -rnd() * 160 * q
    ctx.fillStyle = `rgba(${ETH_RGB},${0.8 * (1 - q)})`
    ctx.fillRect(px + dx, py + dy, 2.5, 2.5)
  }
}

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = GHOST_CUES
  const a = win(t, 6.4, 17.2, 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  const rise = (1 - easeOut(prog(t, 6.4, 7.0))) * 30
  const X = 120
  const Y = 90 + rise
  const W = 1680
  const H = 900
  panel(ctx, X, Y, W, H, 22, C.panel, C.line2)
  const ghost = t >= K.ghostOn && t < K.leave + 0.1
  const sent = t >= K.send
  const left = t >= K.leave
  // how much of the chat is still there (it dissolves on leave)
  const fade = 1 - prog(t, K.dissolve[0], K.dissolve[0] + 0.9)

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
  const sy = Y + 150
  if (sent && fade > 0) {
    ctx.save()
    ctx.globalAlpha *= fade
    ctx.fillStyle = `rgba(${ETH_RGB},0.08)`
    ctx.beginPath()
    ctx.roundRect(X + 16, sy, 308, 64, 8)
    ctx.fill()
    icon(ctx, GHOST, X + 40, sy + 22, 16, C.eth, 2)
    text(ctx, 'My blood test shows high…', X + 56, sy + 28, { size: 17, color: C.fg })
    text(ctx, 'ghost · erased when you leave it', X + 32, sy + 52, { size: 12.5, family: MONO, color: C.eth })
    ctx.restore()
    dust(ctx, X + 16, sy, 308, 64, prog(t, K.dissolve[0], K.dissolve[1]), 3)
  } else if (sent) dust(ctx, X + 16, sy, 308, 64, prog(t, K.dissolve[0], K.dissolve[1]), 3)
  // the saved chat sits below the ghost one, and moves up once the ghost has dissolved
  const below = sent ? 72 * (1 - easeInOut(prog(t, K.dissolve[0] + 0.7, K.dissolve[1] + 0.3))) : 0
  text(ctx, 'Explain Ethereum blobs simply', X + 32, sy + below + 28, { size: 17, color: C.soft })
  text(ctx, 'Claude Sonnet 5.5 · 2h ago', X + 32, sy + below + 52, { size: 12.5, family: MONO, color: C.dim })

  // top bar with the ghost switch
  const M = X + 340
  ctx.strokeStyle = C.line
  ctx.beginPath()
  ctx.moveTo(M, Y + 76)
  ctx.lineTo(X + W, Y + 76)
  ctx.stroke()
  panel(ctx, M + 28, Y + 20, 250, 40, 8, C.panel, C.line2)
  text(ctx, 'Claude Sonnet 5.5  ⌄', M + 46, Y + 46, { size: 16, family: MONO, color: C.fg })
  const gw = ghost ? 176 : 104
  const gx = X + W - 160 - gw - 12
  ctx.beginPath()
  ctx.roundRect(gx, Y + 24, gw, 32, 16)
  ctx.fillStyle = ghost ? `rgba(${ETH_RGB},0.1)` : 'rgba(0,0,0,0)'
  ctx.fill()
  ctx.save()
  if (ghost) ctx.setLineDash([5, 4])
  ctx.strokeStyle = ghost ? `rgba(${ETH_RGB},0.6)` : C.line2
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
  icon(ctx, GHOST, gx + 22, Y + 40, 15, ghost ? C.eth : C.dim, 2)
  text(ctx, ghost ? 'GHOST · LEAVE' : 'GHOST', gx + 38, Y + 45, { size: 12.5, family: MONO, color: ghost ? C.eth : C.dim, spacing: '0.12em' })
  panel(ctx, X + W - 140, Y + 22, 112, 36, 8, C.panel, C.line2)
  text(ctx, '0x71F…92A', X + W - 84, Y + 45, { size: 13, family: MONO, color: C.fg, align: 'center' })

  const CX = M + 120
  const CW = 1060
  const mid = CX + CW / 2
  const BY = Y + H - 150

  // empty state: normal, then ghost
  if (!sent) {
    if (ghost) {
      const ga = easeOut(prog(t, K.ghostOn, K.ghostOn + 0.4))
      ctx.save()
      ctx.globalAlpha *= ga
      ctx.save()
      ctx.setLineDash([8, 6])
      panel(ctx, mid - 340, Y + 150, 680, 130, 14, `rgba(${ETH_RGB},0.05)`, `rgba(${ETH_RGB},0.45)`)
      ctx.restore()
      icon(ctx, GHOST, mid - 70, Y + 192, 18, C.eth, 2)
      text(ctx, 'GHOST CHAT', mid - 52, Y + 198, { size: 14, family: MONO, color: C.eth, spacing: '0.16em' })
      text(ctx, 'Nothing is saved: not the chat, not your files, not even', mid, Y + 236, { size: 18, color: C.soft, align: 'center' })
      text(ctx, 'in this browser. Leave the chat and it’s gone.', mid, Y + 262, { size: 18, color: C.soft, align: 'center' })
      ctx.restore()
    }
    nullMark(ctx, mid, Y + 360, 26, 1, 1, 5)
    text(ctx, 'Ask privately.', mid, Y + 450, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
  }

  // the conversation, which dissolves on leave
  if (sent) {
    if (fade > 0) {
      ctx.save()
      ctx.globalAlpha *= fade
      const qw = measure(ctx, Q, { size: 20 }) + 44
      ctx.beginPath()
      ctx.roundRect(CX + CW - qw, Y + 110, qw, 50, 18)
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fill()
      ctx.strokeStyle = C.line2
      ctx.stroke()
      text(ctx, Q, CX + CW - qw + 22, Y + 142, { size: 20, color: C.fg })
      const AY = Y + 200
      panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
      nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
      if (t < K.streamStart) {
        spinner(ctx, CX + 74, AY + 12, 9, t)
        text(ctx, 'Routing privately…', CX + 98, AY + 19, { size: 17, family: MONO, color: C.soft })
      } else {
        const total = ANSWER.reduce((n, l) => n + l.length, 0)
        let budget = Math.floor(prog(t, K.streamStart, K.streamEnd) * total)
        ANSWER.forEach((l, i) => {
          if (budget <= 0) return
          text(ctx, l.slice(0, budget), CX + 70, AY + 22 + i * 40, { size: 23, color: C.soft })
          budget -= l.length
        })
        const ma = easeOut(prog(t, K.streamEnd, K.streamEnd + 0.4))
        text(ctx, 'Claude Sonnet 5.5 · 2.2s · paid by proof ✓', CX + 70, AY + 22 + ANSWER.length * 40 + 12, { size: 14, family: MONO, color: C.dim, alpha: ma })
      }
      ctx.restore()
    }
    const dp = prog(t, K.dissolve[0], K.dissolve[1])
    dust(ctx, CX + CW - 680, Y + 110, 680, 50, dp, 11)
    dust(ctx, CX + 60, Y + 200, 640, 190, dp, 17)

    // after leaving: what is left
    if (left) {
      const la = easeOut(prog(t, K.dissolve[1] - 0.3, K.dissolve[1] + 0.2))
      ctx.save()
      ctx.globalAlpha *= la
      text(ctx, 'WHAT IS LEFT OF THAT CHAT', mid, Y + 210, { size: 14, family: MONO, color: C.dim, align: 'center', spacing: '0.16em' })
      const rows = [
        { k: 'chat history in this browser', v: 'none' },
        { k: 'photos and files on this device', v: 'none' },
        { k: 'copies on NULL’s servers', v: 'never' },
      ]
      rows.forEach((r, i) => {
        const ra = easeOut(prog(t, K.checks[i], K.checks[i] + 0.3))
        if (!ra) return
        const y = Y + 280 + i * 64
        ctx.save()
        ctx.globalAlpha *= ra
        panel(ctx, mid - 360, y - 38, 720, 56, 10, C.panel, `rgba(${OK_RGB},0.25)`)
        check(ctx, mid - 326, y - 10, 16, C.ok, 2.4)
        text(ctx, r.k, mid - 300, y - 2, { size: 19, color: C.soft })
        text(ctx, r.v, mid + 336, y - 2, { size: 18, family: MONO, color: C.ok, align: 'right' })
        ctx.restore()
      })
      ctx.restore()
    }
  }

  // ghost reminder + composer
  if (ghost && sent) text(ctx, 'GHOST CHAT · not saved anywhere · leaving it or closing the tab erases it', CX, BY - 22, { size: 13, family: MONO, color: C.eth })
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const TX = CX + 24
  if (!sent) {
    const n = Math.floor(prog(t, K.typeStart, K.typeEnd) * Q.length)
    if (n <= 0) text(ctx, 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
    else {
      const w = text(ctx, Q.slice(0, n), TX, BY + 56, { size: 21, color: C.fg })
      if (Math.floor(t * 2.4) % 2 === 0) {
        ctx.fillStyle = C.eth
        ctx.fillRect(TX + w + 2, BY + 36, 3, 26)
      }
    }
  } else text(ctx, 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
  ctx.beginPath()
  ctx.roundRect(CX + CW - 54, BY + 26, 44, 44, 10)
  ctx.fillStyle = C.fg
  ctx.fill()
  text(ctx, '↑', CX + CW - 32, BY + 57, { size: 24, weight: 600, color: C.bg, align: 'center' })

  // the pointer: GHOST on, later GHOST · LEAVE
  const btn = { x: gx + 50, y: Y + 40 }
  const pa = win(t, K.ghostOn - 0.9, K.ghostOn + 0.4, 0.2, 0.3) + win(t, K.leave - 0.9, K.leave + 0.4, 0.2, 0.3)
  if (pa > 0) {
    const from = t < K.leave - 1 ? { x: mid, y: Y + 520 } : { x: mid + 200, y: Y + 600 }
    const at = t < K.leave - 1 ? K.ghostOn : K.leave
    const m = easeInOut(prog(t, at - 0.8, at - 0.1))
    const px = from.x + (btn.x - from.x) * m
    const py = from.y + (btn.y - from.y) * m
    ctx.save()
    ctx.globalAlpha *= Math.min(1, pa)
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px, py + 30)
    ctx.lineTo(px + 8, py + 23)
    ctx.lineTo(px + 14, py + 36)
    ctx.lineTo(px + 19, py + 34)
    ctx.lineTo(px + 13, py + 21)
    ctx.lineTo(px + 23, py + 21)
    ctx.closePath()
    ctx.fillStyle = C.fg
    ctx.fill()
    ctx.strokeStyle = C.bg
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
    for (const c of [K.ghostOn, K.leave]) {
      const r = prog(t, c, c + 0.45)
      if (r > 0 && r < 1) {
        ctx.beginPath()
        ctx.arc(btn.x, btn.y, 8 + r * 26, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${ETH_RGB},${0.6 * (1 - r)})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

/** auto-delete for normal chats */
function autoDelete(ctx: CanvasRenderingContext2D, t: number) {
  const K = GHOST_CUES
  const a = win(t, K.auto[0], K.auto[1], 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'AND FOR YOUR NORMAL CHATS', 960, 200, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Auto-delete after 24 hours, 7 or 30 days.', 960, 268, { size: 52, weight: 500, align: 'center', spacing: '-1.5px' })
  const SX = 660
  const SY = 340
  panel(ctx, SX, SY, 600, 560, 18, C.panel, C.line2)
  const chats = [
    { t: 'Explain Ethereum blobs simply', age: '2h ago', old: false },
    { t: 'Summarize this lease for me', age: '3d ago', old: true },
    { t: 'Draft a reply to my landlord', age: '5d ago', old: true },
    { t: 'What does a nullifier do?', age: '9d ago', old: true },
  ]
  chats.forEach((c, i) => {
    const y = SY + 40 + i * 76
    const gone = c.old ? prog(t, K.gone[0] + (i - 1) * 0.2, K.gone[0] + 0.5 + (i - 1) * 0.2) : 0
    if (gone >= 1) return
    ctx.save()
    ctx.globalAlpha *= 1 - gone
    ctx.translate(-gone * 40, 0)
    text(ctx, c.t, SX + 36, y + 28, { size: 21, color: C.soft })
    text(ctx, `Claude Sonnet 5.5 · ${c.age}`, SX + 36, y + 54, { size: 14, family: MONO, color: c.old && t > K.pick ? C.bad : C.dim })
    ctx.restore()
  })
  // the setting
  const on = t >= K.pick
  panel(ctx, SX + 24, SY + 470, 552, 54, 10, C.panel, on ? `rgba(${OK_RGB},0.4)` : C.line2)
  text(ctx, 'AUTO-DELETE', SX + 52, SY + 504, { size: 15, family: MONO, color: C.dim, spacing: '0.12em' })
  text(ctx, on ? '24 hours  ⌄' : 'off  ⌄', SX + 552, SY + 504, { size: 16, family: MONO, color: on ? C.ok : C.faint, align: 'right' })
  const r = prog(t, K.pick, K.pick + 0.45)
  if (r > 0 && r < 1) {
    ctx.beginPath()
    ctx.arc(SX + 500, SY + 497, 8 + r * 26, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${OK_RGB},${0.6 * (1 - r)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  const na = easeOut(prog(t, K.gone[1] + 0.6, K.gone[1] + 1.1))
  text(ctx, 'files and images go with them · backups you saved are not touched', 960, 960, { size: 18, family: MONO, color: C.dim, align: 'center', alpha: na })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = GHOST_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, ETH_RGB, 0.07)
  icon(ctx, GHOST, 960, 320, 130, C.fg, 2)
  text(ctx, 'Ask. Leave no trace.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Ghost Chats, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawGhost(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  where(ctx, t)
  app(ctx, t)
  autoDelete(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

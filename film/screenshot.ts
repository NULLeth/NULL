// "Screenshot Shield": ~27 s promo. Title → a withdrawal screenshot is dropped into the chat →
// OCR reads it line by line → Prompt Shield finds name, email, phone, wallet and IBAN → solid
// labelled boxes cover them → a question, an honest answer → how it runs → end card.
// The five details are what NULL Chat really covered on this test screenshot.

import { PROJECT } from '../src/config/project'
import { C, MONO, SANS, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const SCREENSHOT_DURATION = 27

export const SCREENSHOT_CUES = {
  drag: [3.5, 4.2],
  ready: 5.0,
  shot: 5.0,
  ocr: [5.6, 7.2],
  found: [7.5, 7.75, 8.0, 8.25, 8.5],
  cover: [9.2, 9.35, 9.5, 9.65, 9.8],
  typeStart: 11.6,
  typeEnd: 12.6,
  send: 13.0,
  streamStart: 13.6,
  streamEnd: 15.9,
  hops: [18.4, 19.2, 20.0, 20.8],
  end: 22.8,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const NAME = 'withdraw.png'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Screenshot Shield', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Emails, wallets and numbers in your screenshots, covered first.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

const CLIP = new Path2D('m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48')
const SCAN_TEXT = new Path2D('M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 8h8 M7 12h10 M7 16h6')

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

// ── the screenshot: a withdrawal page, drawn in a 1400×900 space ──────────────

const ROWS: { k: string; v: string; kind?: string; mono?: boolean }[] = [
  { k: 'Name:', v: 'Alice Morgan', kind: 'NAME' },
  { k: 'Email:', v: 'alice.morgan@protonmail.com', kind: 'EMAIL' },
  { k: 'Phone:', v: '+44 7911 123456', kind: 'PHONE' },
  { k: 'To address:', v: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', kind: 'WALLET', mono: true },
  { k: 'Bank (fallback):', v: 'GB33 BUKB 2020 1555 5555 55', kind: 'IBAN', mono: true },
  { k: 'Amount:', v: '1.25 ETH  (~ $3,180)' },
]

/** `cover[i]` 0..1 covers detail i; `seen` 0..1 is how far OCR has read; `found[i]` outlines detail i */
function screenshot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, cover: number[], seen = 1, found: number[] = [], radius = 12) {
  const s = w / 1400
  const h = 900 * s
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.clip()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#f6f7fa'
  ctx.fillRect(0, 0, 1400, 900)
  ctx.fillStyle = '#141823'
  ctx.fillRect(0, 0, 1400, 90)
  text(ctx, 'CoinVault', 40, 58, { size: 34, weight: 700, color: '#fff', family: SANS })
  ctx.fillStyle = '#3a4154'
  ctx.beginPath()
  ctx.arc(1340, 45, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#e1e4eb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(200, 140, 1000, 700, 24)
  ctx.fill()
  ctx.stroke()
  text(ctx, 'Withdraw ETH', 250, 222, { size: 40, weight: 700, color: '#141823', family: SANS })
  let di = 0
  ROWS.forEach((r, i) => {
    const ry = 312 + i * 78
    text(ctx, r.k, 250, ry, { size: 26, color: '#6e7382', family: SANS })
    const fam = r.mono ? "'Consolas', ui-monospace, monospace" : SANS
    const vw = measure(ctx, r.v, { size: 28, family: fam })
    text(ctx, r.v, 520, ry, { size: 28, color: '#141823', family: fam })
    if (r.kind) {
      const k = di++
      const f = clamp(found[k] ?? 0)
      const cv = clamp(cover[k] ?? 0)
      if (f > 0 && cv < 1) {
        ctx.save()
        ctx.globalAlpha *= f * (1 - cv)
        ctx.strokeStyle = `rgb(${OK_RGB})`
        ctx.lineWidth = 3
        ctx.strokeRect(512, ry - 30, vw + 16, 42)
        ctx.fillStyle = `rgb(${OK_RGB})`
        ctx.fillRect(512, ry - 54, measure(ctx, r.kind, { size: 16, family: MONO }) + 14, 24)
        text(ctx, r.kind, 519, ry - 36, { size: 16, family: MONO, color: '#06281a', weight: 600 })
        ctx.restore()
      }
      if (cv > 0) {
        // the box drops in from slightly larger
        const g = 1 + (1 - easeOut(cv)) * 0.15
        const bw = (vw + 16) * g
        const bh = 44 * g
        const bx = 512 + (vw + 16) / 2 - bw / 2
        const by = ry - 31 + 22 - bh / 2
        ctx.save()
        ctx.globalAlpha *= easeOut(cv)
        ctx.fillStyle = '#16161a'
        ctx.beginPath()
        ctx.roundRect(bx, by, bw, bh, 6)
        ctx.fill()
        text(ctx, r.kind, bx + bw / 2, by + bh / 2 + 7, { size: 20, family: MONO, weight: 600, color: '#9aa3ff', align: 'center' })
        ctx.restore()
      }
    }
  })
  ctx.fillStyle = '#2858f0'
  ctx.beginPath()
  ctx.roundRect(250, 770, 900, 50, 12)
  ctx.fill()
  text(ctx, 'Confirm withdrawal', 700, 804, { size: 26, weight: 700, color: '#fff', align: 'center', family: SANS })
  // OCR: what's been read so far gets a faint tint, the rest waits under the sweep
  if (seen < 1) {
    const sy = 90 + 760 * seen
    ctx.fillStyle = `rgba(${OK_RGB},0.06)`
    ctx.fillRect(0, 0, 1400, sy)
    const g = ctx.createLinearGradient(0, sy - 70, 0, sy)
    g.addColorStop(0, `rgba(${OK_RGB},0)`)
    g.addColorStop(1, `rgba(${OK_RGB},0.35)`)
    ctx.fillStyle = g
    ctx.fillRect(0, sy - 70, 1400, 70)
    ctx.fillStyle = `rgba(${OK_RGB},0.95)`
    ctx.fillRect(0, sy, 1400, 4)
  }
  ctx.restore()
}

const DETAILS = [
  { k: 'name', v: 'Alice Morgan' },
  { k: 'email', v: 'alice.morgan@proton…' },
  { k: 'phone', v: '+44 7911 123456' },
  { k: 'wallet', v: '0x71C7…976F' },
  { k: 'IBAN', v: 'GB33 BUKB 2020 …' },
]

function app(ctx: CanvasRenderingContext2D, t: number) {
  const K = SCREENSHOT_CUES
  const a = win(t, 3.1, 17.7, 0.5, 0.45)
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
  if (t >= K.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'Is anything wrong with th…', X + 32, Y + 178, { size: 17, color: C.fg })
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
  const sent = t >= K.send
  const found = K.found.map((at) => easeOut(prog(t, at, at + 0.25)))
  const cover = K.cover.map((at) => prog(t, at, at + 0.3))

  // empty chat
  const ea = 1 - prog(t, K.shot - 0.4, K.shot)
  if (ea > 0) {
    ctx.save()
    ctx.globalAlpha *= ea
    nullMark(ctx, mid, Y + 250, 26, 1, 1, 5)
    text(ctx, 'Ask privately.', mid, Y + 340, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    text(ctx, 'Attach a screenshot: personal details are covered in your browser', mid, Y + 394, { size: 18, family: MONO, color: C.dim, align: 'center' })
    ctx.restore()
  }

  // ── the screenshot, read and covered ──
  const pa = win(t, K.shot, K.typeStart - 0.1, 0.45, 0.35)
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    const PY = Y + 106 + (1 - easeOut(prog(t, K.shot, K.shot + 0.5))) * 16
    panel(ctx, CX, PY, CW, 480, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, NAME, CX + 30, PY + 42, { size: 14, family: MONO, color: C.dim, spacing: '0.06em' })
    screenshot(ctx, CX + 30, PY + 60, 620, cover, t < K.ocr[0] ? 0 : prog(t, K.ocr[0], K.ocr[1]), found)
    const RX = CX + 690
    text(ctx, 'SCREENSHOT SHIELD', RX, PY + 76, { size: 14, family: MONO, color: C.ok, spacing: '0.16em' })
    const ra = easeOut(prog(t, K.ocr[0], K.ocr[0] + 0.4))
    if (ra > 0) {
      ctx.save()
      ctx.globalAlpha *= ra
      const reading = t < K.ocr[1]
      if (reading) spinner(ctx, RX + 9, PY + 114, 8, t, C.ok)
      else check(ctx, RX + 9, PY + 114, 13, C.ok, 2.4)
      text(ctx, reading ? 'reading the text in your browser…' : 'text read on your device', RX + 28, PY + 120, { size: 16, family: MONO, color: reading ? C.soft : C.ok })
      ctx.restore()
    }
    DETAILS.forEach((d, i) => {
      const fa = found[i]
      if (!fa) return
      const y = PY + 172 + i * 50
      const done = cover[i] >= 1
      ctx.save()
      ctx.globalAlpha *= fa
      text(ctx, d.k, RX, y, { size: 15, family: MONO, color: C.dim })
      const vw = text(ctx, d.v, RX + 80, y, { size: 17, color: done ? C.dim : C.fg })
      if (done) {
        ctx.fillStyle = C.dim
        ctx.fillRect(RX + 80, y - 6, vw, 1.5)
        text(ctx, 'covered', RX + 92 + vw, y, { size: 14, family: MONO, color: C.ok })
      }
      ctx.restore()
    })
    const ca = easeOut(prog(t, K.cover[4] + 0.4, K.cover[4] + 0.9))
    text(ctx, 'the model sees boxes that say what was there', RX, PY + 440, { size: 13.5, family: MONO, color: C.ok, alpha: ca })
    ctx.restore()
  }

  // ── after sending ──
  if (sent) {
    const ua = easeOut(prog(t, K.send, K.send + 0.3))
    ctx.save()
    ctx.globalAlpha *= ua
    screenshot(ctx, CX + CW - 300, Y + 108, 300, [1, 1, 1, 1, 1], 1, [], 12)
    const q = 'Is anything wrong with this withdrawal?'
    const qw = measure(ctx, q, { size: 21 }) + 44
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 312, qw, 52, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, q, CX + CW - qw + 22, Y + 345, { size: 21, color: C.fg })
    const note = 'cleaned in your browser · 5 details covered'
    const nw = measure(ctx, note, { size: 13, family: MONO })
    shieldIcon(ctx, CX + CW - nw - 16, Y + 387, 7, C.ok)
    text(ctx, note, CX + CW - nw, Y + 392, { size: 13, family: MONO, color: C.ok })
    ctx.restore()

    const AY = Y + 450
    panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
    if (t < K.streamStart) {
      spinner(ctx, CX + 74, AY + 12, 9, t)
      text(ctx, 'Routing privately…', CX + 98, AY + 19, { size: 17, family: MONO, color: C.soft })
    } else {
      const lines = [
        'Amount and asset look normal: 1.25 ETH.',
        'The destination address is hidden from me, so check it',
        'on your device, character by character, before you confirm.',
      ]
      const total = lines.reduce((n, l) => n + l.length, 0)
      let budget = Math.floor(prog(t, K.streamStart, K.streamEnd) * total)
      lines.forEach((l, i) => {
        if (budget <= 0) return
        text(ctx, l.slice(0, budget), CX + 70, AY + 22 + i * 42, { size: 24, color: C.soft })
        budget -= l.length
      })
      const ma = easeOut(prog(t, K.streamEnd, K.streamEnd + 0.4))
      if (ma > 0) {
        const my = AY + 22 + lines.length * 42 + 14
        ctx.save()
        ctx.globalAlpha *= ma
        const m1 = 'Claude Sonnet 5.5 · 2.6s · '
        text(ctx, m1, CX + 70, my, { size: 15, family: MONO, color: C.dim })
        const mx = CX + 70 + measure(ctx, m1, { size: 15, family: MONO })
        text(ctx, 'paid privately', mx, my, { size: 15, family: MONO, color: C.ok })
        check(ctx, mx + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        text(ctx, 'it never saw your name, email, phone, wallet or IBAN', CX + 70, my + 30, { size: 15, family: MONO, color: C.faint })
        ctx.restore()
      }
    }
  }

  // ── attach tray ──
  const dropped = t >= K.drag[1]
  if (dropped && !sent) {
    const ca = easeOut(prog(t, K.drag[1] + 0.05, K.drag[1] + 0.35))
    ctx.save()
    ctx.globalAlpha *= ca
    const x = CX
    const y = BY - 84 + (1 - ca) * 14
    const w = 340
    panel(ctx, x, y, w, 58, 10, C.panel, C.line2)
    const busy = t < K.ready
    const done = t >= K.cover[4] + 0.3
    if (busy) {
      panel(ctx, x + 9, y + 9, 40, 40, 6, C.panel, C.line2)
      spinner(ctx, x + 29, y + 29, 8, t)
    } else screenshot(ctx, x + 9, y + 15, 40, done ? [1, 1, 1, 1, 1] : [], 1, [], 4)
    text(ctx, NAME, x + 60, y + 25, { size: 15, color: C.fg })
    const note = busy ? 'opening in your browser…' : !done ? 'reading the text…' : '5 details covered'
    text(ctx, note, x + 60, y + 45, { size: 11.5, family: MONO, color: done ? C.ok : C.dim })
    if (done) icon(ctx, SCAN_TEXT, x + w - 50, y + 29, 18, C.ok, 2)
    text(ctx, '×', x + w - 18, y + 34, { size: 18, color: C.dim, align: 'center' })
    ctx.restore()
  }

  // composer
  panel(ctx, CX, BY, CW, 96, 14, C.panel, C.line2)
  const btn = (bx: number, w: number, label: string, on: boolean, shield = false, clip = false) => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = on ? `rgba(${OK_RGB},0.08)` : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = on ? `rgba(${OK_RGB},0.4)` : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (shield) shieldIcon(ctx, bx + 22, BY + 48, 8, C.ok)
    if (clip) icon(ctx, CLIP, bx + 23, BY + 48, 22, on ? C.ok : C.dim, 2)
    text(ctx, label, shield || clip ? bx + 40 : bx + w / 2, BY + 54, { size: 14, family: MONO, color: on ? C.ok : C.dim, align: shield || clip ? 'left' : 'center', spacing: '0.08em' })
  }
  btn(CX + 12, 62, dropped && !sent ? '1' : '', dropped && !sent, false, true)
  btn(CX + 84, 74, 'WEB', false)
  btn(CX + 166, 92, 'IMAGE', false)
  btn(CX + 266, 112, 'SHIELD', true, true)
  const TX = CX + 400
  if (!sent) {
    const q = 'Is anything wrong with this withdrawal?'
    const n = Math.floor(prog(t, K.typeStart, K.typeEnd) * q.length)
    if (n <= 0) text(ctx, dropped ? 'Ask about your files…' : 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
    else {
      const w = text(ctx, q.slice(0, n), TX, BY + 56, { size: 21, color: C.fg })
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
  text(ctx, 'payment identity hidden · personal details shielded, the model reads the rest', CX + CW / 2, Y + H - 24, { size: 13, family: MONO, color: C.ok, align: 'center' })

  // the drag
  const dg = prog(t, K.drag[0], K.drag[1])
  const dga = win(t, K.drag[0] - 0.2, K.drag[1] + 0.15, 0.2, 0.15)
  if (dga > 0) {
    const e = easeInOut(dg)
    const px = X + W + 60 + (CX + 520 - X - W - 60) * e
    const py = Y + 380 + (BY + 30 - Y - 380) * e
    ctx.save()
    ctx.globalAlpha *= dga
    screenshot(ctx, px + 10, py + 6, 110, [], 1, [], 6)
    ctx.restore()
    pointer(ctx, px, py, dga)
  }
  ctx.restore()
}

const HOPS = [
  { k: 'YOUR SCREENSHOT', v: 'details readable' },
  { k: 'OCR', v: 'text read locally' },
  { k: 'PROMPT SHIELD', v: '5 details covered' },
  { k: 'THE MODEL', v: 'sees [EMAIL] boxes' },
]

function howItRuns(ctx: CanvasRenderingContext2D, t: number) {
  const K = SCREENSHOT_CUES
  const a = win(t, 17.5, K.end, 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HOW IT RUNS', 960, 220, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Read on your device. Covered before it leaves.', 960, 288, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })
  ctx.save()
  ctx.setLineDash([8, 8])
  panel(ctx, 110, 380, 1290, 300, 22, 'rgba(255,255,255,0.012)', `rgba(${OK_RGB},0.4)`)
  ctx.restore()
  text(ctx, 'YOUR BROWSER', 140, 424, { size: 15, family: MONO, color: C.ok, spacing: '0.16em' })
  HOPS.forEach((h, i) => {
    const x = i < 3 ? 150 + i * 420 : 1500
    const lit = easeOut(prog(t, K.hops[i], K.hops[i] + 0.3))
    panel(ctx, x, 460, 320, 180, 16, C.panel, lit ? `rgba(${i === 3 ? ETH_RGB : OK_RGB},${0.2 + 0.4 * lit})` : C.line2)
    text(ctx, h.k, x + 26, 504, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    screenshot(ctx, x + 26, 516, 124, i < 2 ? [] : [1, 1, 1, 1, 1], 1, [], 6)
    text(ctx, h.v, x + 26, 628, { size: 20, weight: 600, spacing: '-0.5px', color: lit ? C.fg : C.muted })
    if (i < 3) {
      const ax0 = x + 324
      const ax1 = i < 2 ? x + 416 : 1496
      ctx.strokeStyle = C.line3
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(ax0, 550)
      ctx.lineTo(ax1, 550)
      ctx.moveTo(ax1 - 8, 544)
      ctx.lineTo(ax1, 550)
      ctx.lineTo(ax1 - 8, 556)
      ctx.stroke()
    }
  })
  const fa = easeOut(prog(t, K.hops[3] + 0.3, K.hops[3] + 0.8))
  text(ctx, 'emails · phone numbers · wallets · IBANs · cards · keys · names after "Name:"', 960, 770, { size: 20, family: MONO, color: C.muted, align: 'center', alpha: fa })
  text(ctx, '7 MB, downloads once · English text reads best · one click to send a picture as it is', 960, 810, { size: 16, family: MONO, color: C.dim, align: 'center', alpha: fa })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = SCREENSHOT_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Screenshot freely.', 960, 540, { size: 84, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Screenshot Shield, live in NULL Chat. Attach any picture.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawScreenshot(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
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

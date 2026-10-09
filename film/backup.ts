// "Encrypted Backup": ~28 s promo. Title → chats live in one browser → back up: generate a
// passphrase, Argon2id makes the key, AES-256-GCM seals one file → restore on a phone →
// what protects it → end card. Dialog texts are the ones NULL Chat shows.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, seeded, spinner, text, win } from './kit'

export const BACKUP_DURATION = 28

export const BACKUP_CUES = {
  problem: [3.2, 6.6],
  open: 7.3,
  generate: 8.4,
  tick: 9.3,
  download: 9.9,
  kdf: [10.1, 11.6],
  encrypt: [11.6, 12.8],
  saved: 12.9,
  restore: [15.4, 20.4],
  pick: 16.6,
  pass: [17.2, 18.1],
  restored: 18.9,
  points: [21.0, 21.5, 22.0],
  end: 24.2,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const PASS = '3HD54-5Y7S6-NAJ5S-J7W7P'
const CHATS = ['Is anything wrong with this withdrawal?', 'What is the notice period?', 'Write a short email to my landlord', 'Explain Ethereum blobs simply']

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Encrypted Backup', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Take your chats anywhere. Only you can open them.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
  ctx.restore()
}

const LOCK = new Path2D('M7 11V7a5 5 0 0 1 10 0v4 M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z')
const KEY = new Path2D('M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z M16.5 7.5h.01')
const FILE = new Path2D('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4')

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

function ripple(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, at: number) {
  const r = prog(t, at, at + 0.45)
  if (r <= 0 || r >= 1) return
  ctx.beginPath()
  ctx.arc(x, y, 8 + r * 24, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${OK_RGB},${0.6 * (1 - r)})`
  ctx.lineWidth = 2
  ctx.stroke()
}

/** a small chat sidebar: the NULL header, chats, and the backup button */
function sidebar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, chats: number, empty: boolean, hi = 0) {
  panel(ctx, x, y, w, h, 18, C.panel, C.line2)
  nullMark(ctx, x + 34, y + 38, 10, 1, 1, 2.6)
  text(ctx, 'NULL', x + 54, y + 44, { size: 16, family: MONO, weight: 600, spacing: '0.26em' })
  text(ctx, 'CHAT', x + 120, y + 44, { size: 13, family: MONO, color: C.dim, spacing: '0.14em' })
  panel(ctx, x + 18, y + 70, w - 36, 40, 7, C.panel, C.line2)
  text(ctx, '+  NEW CHAT', x + w / 2, y + 96, { size: 13, family: MONO, color: C.fg, align: 'center', spacing: '0.12em' })
  if (empty) {
    text(ctx, 'Your chats stay in this browser.', x + w / 2, y + 160, { size: 15, color: C.dim, align: 'center' })
    text(ctx, 'restore an encrypted backup', x + w / 2, y + 194, { size: 13, family: MONO, color: hi ? C.fg : C.soft, align: 'center' })
    ctx.fillStyle = C.line3
    ctx.fillRect(x + w / 2 - measure(ctx, 'restore an encrypted backup', { size: 13, family: MONO }) / 2, y + 200, measure(ctx, 'restore an encrypted backup', { size: 13, family: MONO }), 1)
    return
  }
  for (let i = 0; i < chats; i++) {
    const cy = y + 132 + i * 62
    if (i === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.beginPath()
      ctx.roundRect(x + 12, cy, w - 24, 54, 7)
      ctx.fill()
    }
    const label = CHATS[i % CHATS.length]
    const fit = measure(ctx, label, { size: 14 }) > w - 60 ? `${label.slice(0, 26)}…` : label
    text(ctx, fit, x + 26, cy + 24, { size: 14, color: i === 0 ? C.fg : C.soft })
    text(ctx, 'Claude Sonnet 5.5 · 2d ago', x + 26, cy + 44, { size: 11, family: MONO, color: C.dim })
  }
  // the backup button at the bottom
  const by = y + h - 70
  panel(ctx, x + 14, by, w - 28, 40, 7, hi ? `rgba(${OK_RGB},0.06)` : C.panel, hi ? `rgba(${OK_RGB},0.4)` : C.line)
  icon(ctx, LOCK, x + 36, by + 20, 15, hi ? C.ok : C.dim, 2)
  text(ctx, 'ENCRYPTED BACKUP', x + 52, by + 25, { size: 11.5, family: MONO, color: hi ? C.ok : C.dim, spacing: '0.12em' })
}

/** the problem: chats live in one browser */
function problem(ctx: CanvasRenderingContext2D, t: number) {
  const K = BACKUP_CUES
  const a = win(t, K.problem[0], K.problem[1], 0.4, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'NO ACCOUNT, NO SERVER', 960, 200, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Your chats live in one browser.', 960, 268, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  // laptop
  panel(ctx, 330, 360, 640, 420, 18, 'rgba(255,255,255,0.02)', C.line2)
  text(ctx, 'THIS LAPTOP', 360, 396, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
  sidebar(ctx, 360, 414, 300, 346, 4, false)
  // phone
  const pa = easeOut(prog(t, K.problem[0] + 0.9, K.problem[0] + 1.4))
  ctx.save()
  ctx.globalAlpha *= pa
  panel(ctx, 1120, 330, 300, 480, 34, 'rgba(255,255,255,0.02)', C.line2)
  text(ctx, 'YOUR PHONE', 1150, 372, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
  sidebar(ctx, 1140, 392, 260, 396, 0, true)
  ctx.restore()
  const qa = easeOut(prog(t, K.problem[0] + 1.6, K.problem[0] + 2.0))
  ctx.save()
  ctx.globalAlpha *= qa
  ctx.setLineDash([8, 8])
  ctx.strokeStyle = C.line3
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(990, 570)
  ctx.lineTo(1100, 570)
  ctx.stroke()
  ctx.setLineDash([])
  text(ctx, '?', 1045, 552, { size: 34, weight: 600, color: C.muted, align: 'center' })
  ctx.restore()
  text(ctx, 'Nothing is stored on a server, so nothing syncs by itself.', 960, 880, { size: 22, family: MONO, color: C.muted, align: 'center', alpha: qa })
  ctx.restore()
}

/** a hex-ish ciphertext line that settles from the plain text */
function scramble(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, p: number, seed: number) {
  const rnd = seeded(seed)
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < s.length; i++) out += rnd() < p ? hex[Math.floor(rnd() * 16)] : s[i]
  text(ctx, out, x, y, { size: 16, family: MONO, color: p > 0.5 ? C.eth : C.soft })
}

function exportScene(ctx: CanvasRenderingContext2D, t: number) {
  const K = BACKUP_CUES
  const a = win(t, 6.4, K.restore[0], 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  // the chat app behind
  const X = 120
  const Y = 90
  panel(ctx, X, Y, 1680, 900, 22, C.panel, C.line2)
  sidebar(ctx, X + 20, Y + 20, 320, 860, 4, false, t >= K.open - 0.2 && t < K.open + 0.4 ? 1 : 0)
  const dim = easeOut(prog(t, K.open, K.open + 0.3))
  // pointer to the backup button
  const bx = X + 120
  const byy = Y + 20 + 860 - 50
  const m = easeInOut(prog(t, K.open - 0.8, K.open - 0.1))
  pointer(ctx, 900 + (bx - 900) * m, 500 + (byy - 500) * m, win(t, K.open - 0.9, K.open + 0.3, 0.2, 0.2))
  ripple(ctx, bx, byy, t, K.open)
  if (dim > 0) {
    ctx.fillStyle = `rgba(3,3,4,${0.72 * dim})`
    ctx.fillRect(X, Y, 1680, 900)
    // the dialog
    const MW = 640
    const MH = 640
    const MX = 960 - MW / 2
    const MY = 220 + (1 - dim) * 20
    ctx.save()
    ctx.globalAlpha *= dim
    panel(ctx, MX, MY, MW, MH, 16, C.panel, C.line2)
    text(ctx, 'PRIVACY · YOUR CHATS', MX + 32, MY + 44, { size: 12, family: MONO, color: C.dim, spacing: '0.16em' })
    text(ctx, 'Encrypted backup', MX + 32, MY + 76, { size: 24, weight: 500 })
    panel(ctx, MX + 32, MY + 104, MW - 64, 44, 8, C.panel, C.line)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath()
    ctx.roundRect(MX + 36, MY + 108, (MW - 72) / 2, 36, 6)
    ctx.fill()
    text(ctx, 'BACK UP', MX + 36 + (MW - 72) / 4, MY + 132, { size: 12, family: MONO, color: C.fg, align: 'center', spacing: '0.12em' })
    text(ctx, 'RESTORE', MX + 36 + ((MW - 72) * 3) / 4, MY + 132, { size: 12, family: MONO, color: C.dim, align: 'center', spacing: '0.12em' })
    panel(ctx, MX + 32, MY + 168, MW - 64, 70, 8, 'rgba(0,0,0,0.25)', C.line2)
    text(ctx, '4 chats · 7 files and images · your shield word list', MX + 50, MY + 198, { size: 14, family: MONO, color: C.soft })
    text(ctx, 'not included: your private balance (it stays tied to this browser)', MX + 50, MY + 222, { size: 12.5, family: MONO, color: C.dim })
    text(ctx, 'PASSPHRASE', MX + 32, MY + 274, { size: 12, family: MONO, color: C.dim, spacing: '0.14em' })
    text(ctx, 'generate a strong one', MX + MW - 32, MY + 274, { size: 12.5, family: MONO, color: C.eth, align: 'right' })
    panel(ctx, MX + 32, MY + 288, MW - 64, 50, 8, 'rgba(0,0,0,0.3)', C.line2)
    icon(ctx, KEY, MX + 56, MY + 313, 16, C.dim, 2)
    const n = Math.floor(prog(t, K.generate, K.generate + 0.35) * PASS.length)
    if (n > 0) text(ctx, PASS.slice(0, n), MX + 80, MY + 320, { size: 19, family: MONO, color: C.fg, spacing: '0.06em' })
    else text(ctx, 'at least 12 characters', MX + 80, MY + 319, { size: 16, family: MONO, color: C.faint })
    if (n >= PASS.length) text(ctx, 'long enough', MX + 32, MY + 362, { size: 12.5, family: MONO, color: C.ok })
    // tick
    const ticked = t >= K.tick
    ctx.strokeStyle = ticked ? C.ok : C.line3
    ctx.lineWidth = 1.5
    ctx.strokeRect(MX + 32, MY + 388, 18, 18)
    if (ticked) check(ctx, MX + 41, MY + 397, 12, C.ok, 2.2)
    text(ctx, 'I wrote the passphrase down. Without it the backup', MX + 64, MY + 403, { size: 15, color: C.soft })
    text(ctx, 'can’t be opened, not by me and not by NULL.', MX + 64, MY + 425, { size: 15, color: C.soft })
    // download button and its phases
    const busy = t >= K.download && t < K.saved
    const ready = ticked && n >= PASS.length
    ctx.beginPath()
    ctx.roundRect(MX + 32, MY + 452, MW - 64, 48, 7)
    ctx.fillStyle = ready ? C.fg : 'rgba(255,255,255,0.25)'
    ctx.fill()
    const phase = t < K.kdf[1] ? 'Making the key from your passphrase (Argon2id)…' : 'Encrypting…'
    if (busy) {
      spinner(ctx, MX + 70, MY + 476, 8, t, C.bg)
      text(ctx, phase.toUpperCase(), MX + 90, MY + 481, { size: 12, family: MONO, color: C.bg, spacing: '0.06em' })
    } else {
      icon(ctx, LOCK, MX + MW / 2 - 132, MY + 476, 15, C.bg, 2.2)
      text(ctx, 'DOWNLOAD ENCRYPTED BACKUP', MX + MW / 2 + 10, MY + 481, { size: 12.5, family: MONO, color: C.bg, align: 'center', spacing: '0.1em' })
    }
    if (t >= K.saved) {
      const sa = easeOut(prog(t, K.saved, K.saved + 0.3))
      ctx.save()
      ctx.globalAlpha *= sa
      panel(ctx, MX + 32, MY + 516, MW - 64, 42, 7, `rgba(${OK_RGB},0.05)`, `rgba(${OK_RGB},0.3)`)
      text(ctx, 'Saved null-chats-2026-10-10.nullbak (2.4 MB). Keep the passphrase safe.', MX + 46, MY + 542, { size: 13, color: C.ok })
      ctx.restore()
    }
    text(ctx, 'AES-256-GCM · key from your passphrase with Argon2id (64 MB, 3 passes)', MX + 32, MY + 600, { size: 11.5, family: MONO, color: C.dim })
    text(ctx, 'made and opened in your browser · NULL never sees the file or the passphrase', MX + 32, MY + 620, { size: 11.5, family: MONO, color: C.dim })
    ctx.restore()

    // what happens inside: memory-hard key, then the chats turn into ciphertext
    const ka = win(t, K.kdf[0], K.saved + 2.2, 0.3, 0.4)
    if (ka > 0) {
      ctx.save()
      ctx.globalAlpha *= ka
      const RX = 1330
      text(ctx, 'ARGON2ID · 64 MB', RX, 260, { size: 13, family: MONO, color: C.ok, spacing: '0.14em' })
      const cells = 16 * 10
      const filled = Math.floor(prog(t, K.kdf[0], K.kdf[1]) * cells)
      for (let i = 0; i < cells; i++) {
        const cx = RX + (i % 16) * 24
        const cy = 278 + Math.floor(i / 16) * 18
        ctx.fillStyle = i < filled ? `rgba(${OK_RGB},${0.25 + 0.5 * ((i * 37) % 11) / 11})` : 'rgba(255,255,255,0.05)'
        ctx.fillRect(cx, cy, 20, 14)
      }
      text(ctx, 'every guess costs 64 MB of memory', RX, 478, { size: 12.5, family: MONO, color: C.dim })
      text(ctx, 'AES-256-GCM', RX, 540, { size: 13, family: MONO, color: C.eth, spacing: '0.14em' })
      const ep = prog(t, K.encrypt[0], K.encrypt[1])
      CHATS.forEach((c, i) => scramble(ctx, c.slice(0, 34), RX, 574 + i * 30, ep, 9 + i))
      const fa = easeOut(prog(t, K.saved, K.saved + 0.4))
      if (fa > 0) {
        ctx.save()
        ctx.globalAlpha *= fa
        icon(ctx, FILE, RX + 22, 732, 34, C.ok, 2)
        icon(ctx, LOCK, RX + 22, 738, 12, C.ok, 2)
        text(ctx, 'null-chats-2026-10-10.nullbak', RX + 52, 738, { size: 15, family: MONO, color: C.ok })
        ctx.restore()
      }
      ctx.restore()
    }
  }
  // pointer: generate, tick, download
  const gx = 960 + 320 - 32 - 80
  const gy = 220 + 274 - 6
  const tx = 960 - 320 + 41
  const ty = 220 + 397
  const dx = 960
  const dy = 220 + 476
  if (t > K.open + 0.4 && t < K.download + 0.6) {
    let px = gx
    let py = gy
    if (t < K.generate) {
      const e = easeInOut(prog(t, K.open + 0.4, K.generate - 0.1))
      px = 900 + (gx - 900) * e
      py = 700 + (gy - 700) * e
    } else if (t < K.tick) {
      const e = easeInOut(prog(t, K.generate + 0.2, K.tick - 0.1))
      px = gx + (tx - gx) * e
      py = gy + (ty - gy) * e
    } else {
      const e = easeInOut(prog(t, K.tick + 0.15, K.download - 0.1))
      px = tx + (dx - tx) * e
      py = ty + (dy - ty) * e
    }
    pointer(ctx, px, py, win(t, K.open + 0.4, K.download + 0.6, 0.2, 0.3))
  }
  ripple(ctx, gx, gy, t, K.generate)
  ripple(ctx, tx, ty, t, K.tick)
  ripple(ctx, dx, dy, t, K.download)
  ctx.restore()
}

function restoreScene(ctx: CanvasRenderingContext2D, t: number) {
  const K = BACKUP_CUES
  const a = win(t, K.restore[0], K.restore[1], 0.5, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'ON YOUR PHONE', 960, 150, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Open the file, type the passphrase.', 960, 214, { size: 50, weight: 500, align: 'center', spacing: '-1.5px' })
  const PX = 560
  const PY = 270
  panel(ctx, PX, PY, 360, 720, 44, 'rgba(255,255,255,0.02)', C.line2)
  const restored = t >= K.restored
  sidebar(ctx, PX + 20, PY + 40, 320, 640, restored ? 4 : 0, !restored, t < K.pick ? 1 : 0)
  // restore panel to the right
  const RX = 1000
  const ra = easeOut(prog(t, K.restore[0] + 0.6, K.restore[0] + 1.0))
  ctx.save()
  ctx.globalAlpha *= ra
  panel(ctx, RX, 330, 520, 420, 16, C.panel, C.line2)
  text(ctx, 'RESTORE', RX + 28, 372, { size: 13, family: MONO, color: C.dim, spacing: '0.16em' })
  ctx.save()
  ctx.setLineDash([6, 6])
  panel(ctx, RX + 28, 396, 464, 60, 10, 'rgba(0,0,0,0)', t >= K.pick ? `rgba(${OK_RGB},0.4)` : C.line3)
  ctx.restore()
  icon(ctx, FILE, RX + 58, 426, 22, t >= K.pick ? C.ok : C.dim, 2)
  text(ctx, t >= K.pick ? 'null-chats-2026-10-10.nullbak' : 'choose a .nullbak file', RX + 82, 432, { size: 15, family: MONO, color: t >= K.pick ? C.fg : C.dim })
  if (t >= K.pick) text(ctx, '2.4 MB', RX + 470, 432, { size: 13, family: MONO, color: C.dim, align: 'right' })
  panel(ctx, RX + 28, 478, 464, 50, 8, 'rgba(0,0,0,0.3)', C.line2)
  icon(ctx, KEY, RX + 52, 503, 16, C.dim, 2)
  const n = Math.floor(prog(t, K.pass[0], K.pass[1]) * PASS.length)
  text(ctx, n ? '•'.repeat(n) : 'the backup’s passphrase', RX + 76, 510, { size: n ? 20 : 15, family: MONO, color: n ? C.fg : C.faint })
  const busy = t >= K.pass[1] + 0.1 && t < K.restored
  ctx.beginPath()
  ctx.roundRect(RX + 28, 548, 464, 48, 7)
  ctx.fillStyle = n >= PASS.length ? C.fg : 'rgba(255,255,255,0.25)'
  ctx.fill()
  if (busy) {
    spinner(ctx, RX + 64, 572, 8, t, C.bg)
    text(ctx, 'DECRYPTING…', RX + 84, 577, { size: 12.5, family: MONO, color: C.bg, spacing: '0.08em' })
  } else text(ctx, 'RESTORE CHATS', RX + 260, 577, { size: 12.5, family: MONO, color: C.bg, align: 'center', spacing: '0.1em' })
  if (restored) {
    const da = easeOut(prog(t, K.restored, K.restored + 0.3))
    ctx.save()
    ctx.globalAlpha *= da
    panel(ctx, RX + 28, 614, 464, 44, 7, `rgba(${OK_RGB},0.05)`, `rgba(${OK_RGB},0.3)`)
    check(ctx, RX + 50, 636, 14, C.ok, 2.4)
    text(ctx, '4 chats added · 7 files restored.', RX + 70, 642, { size: 15, color: C.ok })
    ctx.restore()
  }
  text(ctx, 'decrypted on this phone · a wrong passphrase opens nothing', RX + 28, 700, { size: 12.5, family: MONO, color: C.dim })
  ctx.restore()
  ctx.restore()
}

const POINTS = [
  { k: 'ARGON2ID', v: 'Guessing is slow', s: '64 MB of memory per try' },
  { k: 'AES-256-GCM', v: 'Tampering shows', s: 'a changed file won’t open' },
  { k: 'YOUR BROWSER', v: 'We never see it', s: 'not the file, not the passphrase' },
]

function points(ctx: CanvasRenderingContext2D, t: number) {
  const K = BACKUP_CUES
  const a = win(t, 20.3, K.end, 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'WHAT PROTECTS IT', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'One file. Only your passphrase opens it.', 960, 300, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, K.points[i] - 0.4, K.points[i]))
    if (!pa) return
    const x = 120 + i * 570
    const y = 420 - (1 - pa) * 14
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, y, 540, 250, 18, C.panel, `rgba(${i === 2 ? ETH_RGB : OK_RGB},0.3)`)
    text(ctx, p.k, x + 36, y + 58, { size: 16, family: MONO, color: i === 2 ? C.eth : C.ok, spacing: '0.16em' })
    text(ctx, p.v, x + 36, y + 136, { size: 38, weight: 600, spacing: '-1px' })
    text(ctx, p.s, x + 36, y + 190, { size: 18, family: MONO, color: C.muted })
    ctx.restore()
  })
  text(ctx, 'not inside: your private balance · it stays tied to the browser that made it', 960, 780, {
    size: 18,
    family: MONO,
    color: C.dim,
    align: 'center',
    alpha: easeOut(prog(t, K.points[2] + 0.5, K.points[2] + 1.0)),
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = BACKUP_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Your chats. Your file. Your key.', 960, 540, { size: 80, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Encrypted Backup, live in NULL Chat.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawBackup(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  problem(ctx, t)
  exportScene(ctx, t)
  restoreScene(ctx, t)
  points(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

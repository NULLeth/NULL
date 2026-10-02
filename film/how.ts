// "How NULL works": a ~60 s explainer, step by step with on-screen captions.
// Mirrors the real zkAPI flow: public deposit → private note in a Merkle tree →
// Groth16 proof + nullifier → short-lived capped key → direct call → settle / withdraw.

import { PROJECT } from '../src/config/project'
import {
  C,
  MONO,
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
  text,
  vignette,
  win,
  wrap,
} from './kit'

export const HOW_DURATION = 61

/** [start, end] of each chapter. */
// Back to back: each chapter fades out before the next fades in, so nothing overlaps.
export const HOW = {
  title: [0, 4.5],
  deposit: [4.5, 12.5],
  note: [12.5, 19.5],
  prove: [19.5, 29.3],
  authorize: [29.3, 37.3],
  use: [37.3, 44.5],
  settle: [44.5, 50.9],
  honest: [50.9, 56.3],
  end: [56.3, 61],
} as const

/** Moments the soundtrack marks. */
export const HOW_CUES = {
  steps: [HOW.deposit[0], HOW.note[0], HOW.prove[0], HOW.authorize[0], HOW.use[0], HOW.settle[0]],
  depositLand: 6.6,
  leaf: 7.2,
  blend: 15.2,
  proofLines: [20.7, 21.4, 22.1, 22.8, 23.5],
  nullifier: 24.6,
  verify: 31.4,
  key: 33.0,
  send: 39.0,
  receipt: 46.2,
  honest: HOW.honest[0] + 0.4,
  end: HOW.end[0] + 0.3,
}

const STEP_NAMES = ['DEPOSIT', 'PRIVATE NOTE', 'PROVE', 'AUTHORIZE', 'USE', 'SETTLE']

function chapterAlpha(t: number, [a, b]: readonly [number, number]) {
  return win(t, a, b, 0.45, 0.35)
}

/** Step header (top) and caption (bottom), shared by the six steps. */
function frame(ctx: CanvasRenderingContext2D, t: number, step: number, a: number, title: string, caption: string) {
  // header: STEP n OF 6 · NAME, plus progress segments
  text(ctx, `STEP ${step + 1} OF 6`, 160, 120, { size: 18, family: MONO, color: C.dim, spacing: '0.18em', alpha: a })
  text(ctx, STEP_NAMES[step], 160, 158, { size: 28, family: MONO, color: C.fg, spacing: '0.2em', weight: 600, alpha: a })
  for (let i = 0; i < 6; i++) {
    ctx.save()
    ctx.globalAlpha *= a
    ctx.fillStyle = i < step ? 'rgba(67,211,146,0.7)' : i === step ? C.eth : 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.roundRect(1760 - (5 - i) * 74 - 64, 130, 64, 5, 2.5)
    ctx.fill()
    ctx.restore()
  }
  // caption: title line + explanation, at the bottom like subtitles
  const ca = a * easeOut(prog(t, 0, 1))
  text(ctx, title, 960, 862, { size: 40, weight: 600, color: C.fg, align: 'center', spacing: '-1px', alpha: ca })
  const lines = wrap(ctx, caption, 1380, { size: 30 })
  lines.slice(0, 2).forEach((ln, i) => text(ctx, ln, 960, 912 + i * 42, { size: 30, color: C.muted, align: 'center', alpha: ca }))
}

function chip(ctx: CanvasRenderingContext2D, cx: number, cy: number, label: string, rgb: string, color: string, size = 18) {
  const w = measure(ctx, label, { size, family: MONO }) + 28
  ctx.beginPath()
  ctx.roundRect(cx - w / 2, cy - size - 6, w, size + 22, 8)
  ctx.fillStyle = `rgba(${rgb},0.12)`
  ctx.fill()
  ctx.strokeStyle = `rgba(${rgb},0.45)`
  ctx.lineWidth = 1.2
  ctx.stroke()
  text(ctx, label, cx, cy + 4, { size, family: MONO, color, align: 'center' })
}

function lockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = s * 0.12
  ctx.beginPath()
  ctx.arc(x, y - s * 0.18, s * 0.26, Math.PI, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.roundRect(x - s * 0.38, y - s * 0.18, s * 0.76, s * 0.6, s * 0.08)
  ctx.stroke()
  ctx.restore()
}

/** Merkle tree: 4 levels, 16 leaves, inside a box. lit = index of the leaf to highlight (or -1). */
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: number, litA: number) {
  const levels = 5
  for (let l = 0; l < levels; l++) {
    const n = 2 ** l
    const yy = y + (h * l) / (levels - 1)
    for (let i = 0; i < n; i++) {
      const xx = x + (w * (i + 0.5)) / n
      if (l < levels - 1) {
        const ny = y + (h * (l + 1)) / (levels - 1)
        for (const c of [2 * i, 2 * i + 1]) {
          const nx = x + (w * (c + 0.5)) / (n * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.moveTo(xx, yy)
          ctx.lineTo(nx, ny)
          ctx.stroke()
        }
      }
      const leaf = l === levels - 1
      const isLit = leaf && i === lit
      ctx.fillStyle = isLit ? `rgba(138,152,255,${0.35 + 0.65 * litA})` : leaf ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.arc(xx, yy, leaf ? 6 : 4, 0, Math.PI * 2)
      ctx.fill()
      if (isLit && litA > 0) glow(ctx, xx, yy, 34, '138,152,255', 0.45 * litA)
    }
  }
}

// ─── title ─────────────────────────────────────────────────────────────────

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.title)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 420, 420, '138,152,255', 0.08)
  nullMark(ctx, 960, 420, 86, easeInOut(prog(t, 0.3, 1.3)), easeOut(prog(t, 1.2, 1.6)), 18)
  text(ctx, 'How NULL works', 960, 640, { size: 72, weight: 600, align: 'center', spacing: '-2.5px', alpha: easeOut(prog(t, 1.4, 2.0)) })
  text(ctx, 'Private API access with zero-knowledge proofs, in six steps.', 960, 712, { size: 32, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.9, 2.5)) })
  ctx.restore()
}

// ─── 1 · deposit ────────────────────────────────────────────────────────────

function deposit(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.deposit)
  if (!a) return
  const t0 = HOW.deposit[0]
  ctx.save()
  ctx.globalAlpha = a
  frame(ctx, t - t0, 0, 1, 'Fund once.', 'Your wallet sends ETH to the zkAPI vault on Ethereum. The deposit is public; it records a commitment, the fingerprint of a secret that never leaves your browser.')

  // browser panel (left)
  panel(ctx, 160, 250, 560, 470, 18, C.panel, C.line2)
  text(ctx, 'YOUR BROWSER', 196, 298, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
  panel(ctx, 196, 330, 488, 110, 12, C.panel2)
  text(ctx, 'WALLET', 222, 372, { size: 16, family: MONO, color: C.dim, spacing: '0.14em' })
  text(ctx, '0x71F…92A', 222, 410, { size: 26, family: MONO, color: C.fg })
  const sa = easeOut(prog(t, 7.4, 8.0))
  panel(ctx, 196, 470, 488, 200, 12, sa > 0 ? '#0d0f1c' : C.panel2, sa > 0 ? `rgba(138,152,255,${0.25 + 0.35 * sa})` : C.line)
  text(ctx, 'PRIVATE NOTE', 222, 512, { size: 16, family: MONO, color: C.dim, spacing: '0.14em' })
  lockIcon(ctx, 640, 508, 34, sa > 0 ? C.eth : C.faint)
  text(ctx, 'secret  ••••••••••••', 222, 556, { size: 22, family: MONO, color: sa > 0 ? C.soft : C.faint })
  text(ctx, 'balance 0.0500 ETH', 222, 596, { size: 22, family: MONO, color: sa > 0 ? C.soft : C.faint })
  text(ctx, 'stays on this device', 222, 640, { size: 18, family: MONO, color: C.eth, alpha: sa })

  // vault panel (right) with the tree
  panel(ctx, 1200, 250, 560, 470, 18, C.panel, C.line2)
  text(ctx, 'zkAPI VAULT · ETHEREUM', 1236, 298, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
  const leafA = easeOut(prog(t, HOW_CUES.leaf, HOW_CUES.leaf + 0.5))
  tree(ctx, 1250, 350, 460, 300, 11, leafA)
  text(ctx, 'commitment → new leaf', 1480, 694, { size: 18, family: MONO, color: C.eth, align: 'center', alpha: leafA })

  // the deposit travelling across
  const mp = easeInOut(prog(t, 5.2, HOW_CUES.depositLand))
  if (mp > 0 && mp < 1) {
    const x = 720 + (1200 - 720) * mp
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.setLineDash([6, 8])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(720, 390)
    ctx.lineTo(x, 390)
    ctx.stroke()
    ctx.setLineDash([])
    chip(ctx, x, 384, '0.05 ETH + commitment', '255,255,255', C.fg, 18)
  }
  ctx.restore()
}

// ─── 2 · the note blends in ──────────────────────────────────────────────────

function note(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.note)
  if (!a) return
  const t0 = HOW.note[0]
  ctx.save()
  ctx.globalAlpha = a
  frame(ctx, t - t0, 1, 1, 'One of many.', 'Your deposit becomes one note among everyone else’s. From here on, nobody can tell which note a request is paid from.')

  const cols = 9
  const rows = 4
  const blend = easeInOut(prog(t, HOW_CUES.blend - 0.4, HOW_CUES.blend + 1.2))
  const mine = 22
  for (let i = 0; i < cols * rows; i++) {
    const x = 960 + (i % cols - (cols - 1) / 2) * 120
    const y = 330 + Math.floor(i / cols) * 110
    const appear = easeOut(prog(t, t0 + 0.3 + i * 0.03, t0 + 0.7 + i * 0.03))
    const isMine = i === mine
    ctx.save()
    ctx.globalAlpha *= appear
    const highlight = isMine ? 1 - blend : 0
    ctx.beginPath()
    ctx.roundRect(x - 40, y - 34, 80, 68, 12)
    ctx.fillStyle = highlight > 0 ? `rgba(13,15,28,1)` : C.panel2
    ctx.fill()
    ctx.strokeStyle = highlight > 0 ? `rgba(138,152,255,${0.25 + 0.6 * highlight})` : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    lockIcon(ctx, x, y + 6, 30, highlight > 0.05 ? `rgba(138,152,255,${0.4 + 0.6 * highlight})` : 'rgba(255,255,255,0.35)')
    if (highlight > 0) text(ctx, 'yours', x, y + 62, { size: 16, family: MONO, color: C.eth, align: 'center', alpha: highlight })
    ctx.restore()
  }
  const ca = easeOut(prog(t, 16.2, 16.8))
  text(ctx, 'every lock is a note in the mainnet vault · any of them could be paying', 960, 790, { size: 20, family: MONO, color: C.dim, align: 'center', alpha: ca })
  ctx.restore()
}

// ─── 3 · prove ────────────────────────────────────────────────────────────────

const CLAIMS: { k: string; good: boolean }[] = [
  { k: 'owns a note in the vault’s tree', good: true },
  { k: 'balance covers the request', good: true },
  { k: 'note has not expired', good: true },
  { k: 'which note   →   not revealed', good: false },
  { k: 'which wallet →   not revealed', good: false },
]

function prove(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.prove)
  if (!a) return
  const t0 = HOW.prove[0]
  ctx.save()
  ctx.globalAlpha = a
  frame(ctx, t - t0, 2, 1, 'Prove, don’t identify.', 'For every request your browser builds a zero-knowledge proof: some note can pay, not which one. A one-time nullifier stops the same balance being spent twice.')

  const rise = (1 - easeOut(prog(t, t0 + 0.4, t0 + 1.2))) * 24
  panel(ctx, 460, 236 + rise, 1000, 540, 18, '#0b0c14', 'rgba(138,152,255,0.45)')
  text(ctx, 'π', 510, 318 + rise, { size: 60, color: C.eth })
  text(ctx, 'ZERO-KNOWLEDGE PROOF', 570, 300 + rise, { size: 20, family: MONO, color: C.fg, spacing: '0.14em' })
  text(ctx, 'groth16 · bn254 · built in your browser · 412 ms', 570, 334 + rise, { size: 18, family: MONO, color: C.dim })

  CLAIMS.forEach((c, i) => {
    const at = HOW_CUES.proofLines[i]
    const ca = easeOut(prog(t, at, at + 0.35))
    if (!ca) return
    const y = 410 + i * 62 + rise
    ctx.save()
    ctx.globalAlpha *= ca
    if (c.good) doneDot(ctx, 528, y - 8, 15)
    else {
      ctx.strokeStyle = C.dim
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(528, y - 8, 14, 0, Math.PI * 2)
      ctx.moveTo(518, y + 2)
      ctx.lineTo(538, y - 18)
      ctx.stroke()
    }
    text(ctx, c.k, 566, y, { size: 26, family: MONO, color: c.good ? C.fg : C.muted })
    ctx.restore()
  })

  const na = easeOut(prog(t, HOW_CUES.nullifier, HOW_CUES.nullifier + 0.4))
  if (na > 0) {
    ctx.save()
    ctx.globalAlpha *= na
    ctx.strokeStyle = C.line
    ctx.beginPath()
    ctx.moveTo(500, 728 + rise)
    ctx.lineTo(1420, 728 + rise)
    ctx.stroke()
    text(ctx, 'nullifier', 510, 758 + rise, { size: 20, family: MONO, color: C.dim })
    text(ctx, '0x3a8d…11f0', 640, 758 + rise, { size: 20, family: MONO, color: C.eth })
    text(ctx, 'one-time · rejected if reused', 1410, 758 + rise, { size: 18, family: MONO, color: C.dim, align: 'right' })
    ctx.restore()
  }
  ctx.restore()
}

// ─── 4 · authorize ────────────────────────────────────────────────────────────

function authorize(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.authorize)
  if (!a) return
  const t0 = HOW.authorize[0]
  ctx.save()
  ctx.globalAlpha = a
  frame(ctx, t - t0, 3, 1, 'A key that expires.', 'The zkAPI server verifies the proof and hands back a short-lived API key with a spending cap. No account, nothing reusable.')

  // proof → server
  panel(ctx, 200, 380, 360, 150, 16, '#0b0c14', 'rgba(138,152,255,0.45)')
  text(ctx, 'π', 236, 470, { size: 54, color: C.eth })
  text(ctx, 'PROOF', 296, 448, { size: 18, family: MONO, color: C.fg, spacing: '0.14em' })
  text(ctx, '+ nullifier', 296, 480, { size: 18, family: MONO, color: C.dim })

  panel(ctx, 780, 330, 400, 250, 18, C.panel, C.line2)
  text(ctx, 'zkAPI SERVER', 816, 378, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
  const v = easeOut(prog(t, HOW_CUES.verify, HOW_CUES.verify + 0.3))
  const rows: [string, string][] = [
    ['verify π', '3 ms'],
    ['nullifier unused', 'ok'],
    ['balance ≥ cap', 'ok'],
  ]
  rows.forEach(([k, val], i) => {
    const ra = easeOut(prog(t, HOW_CUES.verify + i * 0.35, HOW_CUES.verify + 0.3 + i * 0.35))
    const y = 430 + i * 48
    text(ctx, k, 816, y, { size: 21, family: MONO, color: C.soft, alpha: Math.max(0.35, ra) })
    if (ra > 0) {
      text(ctx, val, 1110, y, { size: 19, family: MONO, color: C.ok, align: 'right', alpha: ra })
      check(ctx, 1136, y - 7, 18, C.ok, 3)
    }
  })
  void v

  // packet from proof to server
  const pp = easeInOut(prog(t, t0 + 0.6, HOW_CUES.verify - 0.1))
  if (pp > 0 && pp < 1) {
    const x = 560 + (780 - 560) * pp
    ctx.fillStyle = C.eth
    ctx.beginPath()
    ctx.arc(x, 455, 7, 0, Math.PI * 2)
    ctx.fill()
    glow(ctx, x, 455, 30, '138,152,255', 0.4)
  }

  // the key
  const ka = easeOut(prog(t, HOW_CUES.key, HOW_CUES.key + 0.5))
  if (ka > 0) {
    ctx.save()
    ctx.globalAlpha *= ka
    const kx = 1300 + (1 - ka) * -40
    panel(ctx, kx, 360, 440, 190, 16, '#0b1410', 'rgba(67,211,146,0.45)')
    text(ctx, 'TEMPORARY KEY', kx + 34, 410, { size: 18, family: MONO, color: C.ok, spacing: '0.14em' })
    text(ctx, 'sk-or-v1-…e91c', kx + 34, 458, { size: 26, family: MONO, color: C.fg })
    text(ctx, 'cap $1.00 · expires in minutes', kx + 34, 504, { size: 19, family: MONO, color: C.muted })
    ctx.strokeStyle = 'rgba(67,211,146,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(1180, 455)
    ctx.lineTo(kx, 455)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

// ─── 5 · use ──────────────────────────────────────────────────────────────────

function use(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.use)
  if (!a) return
  const t0 = HOW.use[0]
  ctx.save()
  ctx.globalAlpha = a
  frame(ctx, t - t0, 4, 1, 'Straight to the model.', 'Your browser calls the model with that key. The provider gets a paid, authorized request, never the wallet that funded it.')

  // browser → provider line with packet
  panel(ctx, 160, 360, 300, 140, 16, C.panel, C.line2)
  text(ctx, 'YOUR BROWSER', 192, 420, { size: 18, family: MONO, color: C.soft, spacing: '0.14em' })
  text(ctx, 'temporary key', 192, 456, { size: 18, family: MONO, color: C.ok })
  panel(ctx, 1460, 360, 300, 140, 16, C.panel, C.line2)
  text(ctx, 'OPENROUTER', 1492, 420, { size: 18, family: MONO, color: C.soft, spacing: '0.14em' })
  text(ctx, '→ Claude / GPT / …', 1492, 456, { size: 18, family: MONO, color: C.muted })
  ctx.strokeStyle = C.line2
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(460, 430)
  ctx.lineTo(1460, 430)
  ctx.stroke()
  const pp = easeInOut(prog(t, HOW_CUES.send, HOW_CUES.send + 1.6))
  if (pp > 0 && pp < 1) {
    const x = 460 + 1000 * pp
    ctx.fillStyle = C.ok
    ctx.beginPath()
    ctx.arc(x, 430, 7, 0, Math.PI * 2)
    ctx.fill()
    glow(ctx, x, 430, 30, '67,211,146', 0.4)
  }

  // what the request carries
  const fields: { k: string; v: string; state: 'ok' | 'no' | 'vis' }[] = [
    { k: 'authorization', v: 'temporary key (capped)', state: 'ok' },
    { k: 'model', v: 'anthropic/claude-sonnet-5.5', state: 'ok' },
    { k: 'prompt', v: '"Explain Ethereum blobs…"', state: 'vis' },
    { k: 'wallet', v: 'not sent', state: 'no' },
    { k: 'account / card', v: 'none', state: 'no' },
  ]
  const fa0 = t0 + 0.8
  panel(ctx, 560, 540, 800, 250, 14, C.panel2)
  fields.forEach((f, i) => {
    const fa = easeOut(prog(t, fa0 + i * 0.3, fa0 + 0.3 + i * 0.3))
    const y = 586 + i * 44
    text(ctx, f.k, 596, y, { size: 20, family: MONO, color: C.dim, alpha: fa })
    const color = f.state === 'no' ? C.ok : f.state === 'vis' ? C.warn : C.soft
    const w = text(ctx, f.v, 850, y, { size: 20, family: MONO, color, alpha: fa })
    if (f.state === 'no' && fa > 0) {
      ctx.save()
      ctx.globalAlpha *= fa
      check(ctx, 850 + w + 20, y - 7, 16, C.ok, 2.5)
      ctx.restore()
    }
  })
  ctx.restore()
}

// ─── 6 · settle ───────────────────────────────────────────────────────────────

function settle(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.settle)
  if (!a) return
  const t0 = HOW.settle[0]
  ctx.save()
  ctx.globalAlpha = a
  frame(ctx, t - t0, 5, 1, 'Pay for what you used.', 'The provider’s signed usage receipt is deducted from your note. Close it whenever you like and withdraw the rest to your wallet.')

  panel(ctx, 280, 320, 520, 300, 18, C.panel, C.line2)
  text(ctx, 'USAGE RECEIPT', 316, 370, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
  const ra = easeOut(prog(t, HOW_CUES.receipt - 0.6, HOW_CUES.receipt))
  const lines: [string, string][] = [
    ['tokens', '1,284'],
    ['charged', '$0.0042'],
    ['signed by', 'provider'],
  ]
  lines.forEach(([k, v], i) => {
    const y = 432 + i * 52
    text(ctx, k, 316, y, { size: 22, family: MONO, color: C.dim, alpha: ra })
    text(ctx, v, 764, y, { size: 22, family: MONO, color: C.fg, align: 'right', alpha: ra })
  })

  panel(ctx, 1120, 320, 520, 300, 18, '#0d0f1c', 'rgba(138,152,255,0.45)')
  text(ctx, 'YOUR PRIVATE NOTE', 1156, 370, { size: 18, family: MONO, color: C.dim, spacing: '0.16em' })
  const dp = easeInOut(prog(t, HOW_CUES.receipt, HOW_CUES.receipt + 1.0))
  const bal = 0.05 - 0.0000015 * dp
  text(ctx, bal.toFixed(7), 1156, 470, { size: 58, weight: 500, color: C.fg, spacing: '-2px' })
  text(ctx, 'ETH', 1520, 470, { size: 22, family: MONO, color: C.muted })
  const wa = easeOut(prog(t, HOW_CUES.receipt + 1.4, HOW_CUES.receipt + 2.0))
  text(ctx, 'close anytime → withdraw to wallet', 1156, 560, { size: 20, family: MONO, color: C.ok, alpha: wa })

  // arrow receipt → note
  const ap = easeInOut(prog(t, HOW_CUES.receipt - 0.2, HOW_CUES.receipt + 0.6))
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(800, 470)
  ctx.lineTo(800 + 320 * ap, 470)
  ctx.stroke()
  ctx.restore()
}

// ─── what stays visible ─────────────────────────────────────────────────────────

function honest(ctx: CanvasRenderingContext2D, t: number) {
  const a = chapterAlpha(t, HOW.honest)
  if (!a) return
  const t0 = HOW.honest[0]
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'HONEST PRIVACY', 960, 170, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'What NULL hides, and what it doesn’t.', 960, 236, { size: 52, weight: 600, align: 'center', spacing: '-1.5px' })
  const cols = [
    { x: 300, title: 'HIDDEN', color: C.ok, rgb: '67,211,146', items: ['the wallet that paid', 'accounts and API keys', 'links between your requests'] },
    { x: 1000, title: 'STILL VISIBLE', color: C.warn, rgb: '224,180,94', items: ['your prompt (the model reads it)', 'your IP (use Tor or a VPN)', 'your public deposit on-chain'] },
  ]
  cols.forEach((c, ci) => {
    const ca = easeOut(prog(t, t0 + 0.5 + ci * 0.5, t0 + 1.0 + ci * 0.5))
    ctx.save()
    ctx.globalAlpha *= ca
    panel(ctx, c.x, 320, 620, 420, 18, C.panel, `rgba(${c.rgb},0.35)`)
    text(ctx, c.title, c.x + 40, 380, { size: 22, family: MONO, color: c.color, spacing: '0.16em' })
    c.items.forEach((it, i) => {
      const y = 470 + i * 84
      if (ci === 0) check(ctx, c.x + 56, y - 9, 24, C.ok, 3.5)
      else {
        ctx.fillStyle = C.warn
        ctx.beginPath()
        ctx.arc(c.x + 56, y - 9, 6, 0, Math.PI * 2)
        ctx.fill()
      }
      text(ctx, it, c.x + 92, y, { size: 30, color: C.fg })
    })
    ctx.restore()
  })
  ctx.restore()
}

// ─── end ────────────────────────────────────────────────────────────────────────

function end(ctx: CanvasRenderingContext2D, t: number) {
  const a = easeOut(prog(t, HOW.end[0] + 0.1, HOW.end[0] + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, '138,152,255', 0.08)
  nullMark(ctx, 960, 330, 86, 1, 1, 18)
  text(ctx, 'NULL', 980, 560, { size: 110, weight: 600, family: MONO, align: 'center', spacing: '0.34em' })
  text(ctx, 'One private balance. Every API.', 960, 640, { size: 40, color: C.muted, align: 'center', spacing: '-0.8px' })
  text(ctx, 'BUILT ON zkAPI  ·  BY THE ETHEREUM FOUNDATION AND OPEN ANONYMITY', 966, 720, { size: 18, family: MONO, color: C.soft, align: 'center', spacing: '0.14em' })
  const site = PROJECT.domain
  const handle = PROJECT.xHandle
  const o = { size: 30, family: MONO }
  const w1 = measure(ctx, site, o)
  const w2 = measure(ctx, handle, o)
  const x0 = 960 - (w1 + 70 + w2) / 2
  text(ctx, site, x0, 850, { ...o, color: C.fg })
  ctx.fillStyle = C.faint
  ctx.fillRect(x0 + w1 + 34, 826, 2, 30)
  text(ctx, handle, x0 + w1 + 70, 850, { ...o, color: C.muted })
  if (PROJECT.token.ca) text(ctx, `${PROJECT.token.ticker} · CA  ${PROJECT.token.ca}`, 960, 922, { size: 22, family: MONO, color: C.muted, align: 'center' })
  ctx.restore()
}

export function drawHow(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.5))
  network(ctx, t, 0.28)

  title(ctx, t)
  deposit(ctx, t)
  note(ctx, t)
  prove(ctx, t)
  authorize(ctx, t)
  use(ctx, t)
  settle(ctx, t)
  honest(ctx, t)
  end(ctx, t)

  vignette(ctx)
  ctx.restore()
}

// "Private Files": ~29 s promo. Title → a photo and a PDF are dropped into the chat →
// what hides in the photo (GPS, camera, date) is dropped by redrawing it → the PDF goes as
// text, shielded, file name included → a question and a filled-back answer → summary → end card.
// The file details and placeholders are what NULL Chat really produced for these two test files.

import { PROJECT } from '../src/config/project'
import { C, MONO, check, clamp, easeInOut, easeOut, glow, grid, measure, network, nullMark, panel, prog, spinner, text, win } from './kit'

export const FILES_DURATION = 29

export const FILES_CUES = {
  drag: [3.5, 4.2],
  ready: [5.0, 5.3],
  photo: 6.1,
  rows: [6.8, 7.1, 7.4],
  redraw: [8.3, 9.1],
  removed: [9.0, 9.2, 9.4],
  doc: 10.7,
  swaps: [11.5, 11.8, 12.1, 12.4, 12.7, 13.0, 13.3],
  typeStart: 15.3,
  typeEnd: 16.2,
  send: 16.5,
  streamStart: 17.0,
  streamEnd: 18.3,
  morph: [18.6, 18.9],
  points: [20.3, 20.7, 21.1],
  end: 23.6,
}

const OK_RGB = '67,211,146'
const ETH_RGB = '138,152,255'
const PHOTO_NAME = 'IMG_2041.jpg'
const DOC_NAME = 'Laura_Schmidt_lease.pdf'

function title(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 0, 3.3, 0.3, 0.4)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 430, 420, OK_RGB, 0.07)
  nullMark(ctx, 960, 420, 80, easeInOut(prog(t, 0.2, 1.0)), easeOut(prog(t, 0.95, 1.3)), 17)
  text(ctx, 'Private Files', 960, 630, { size: 88, weight: 600, align: 'center', spacing: '-3px', alpha: easeOut(prog(t, 1.1, 1.6)) })
  text(ctx, 'Documents and photos, cleaned before the AI sees them.', 960, 700, { size: 34, color: C.muted, align: 'center', alpha: easeOut(prog(t, 1.5, 2.0)) })
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

/** a page icon */
function pageIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x - s * 0.6, y - s)
  ctx.lineTo(x + s * 0.25, y - s)
  ctx.lineTo(x + s * 0.6, y - s * 0.62)
  ctx.lineTo(x + s * 0.6, y + s)
  ctx.lineTo(x - s * 0.6, y + s)
  ctx.closePath()
  ctx.stroke()
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x - s * 0.32, y - s * 0.2 + i * s * 0.36)
    ctx.lineTo(x + s * 0.32, y - s * 0.2 + i * s * 0.36)
    ctx.stroke()
  }
  ctx.restore()
}

/** the test photo: an evening street with the Berlin TV tower (it was "taken" at 52.52, 13.405) */
function photo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 10) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, '#2b3a67')
  sky.addColorStop(0.55, '#c9785a')
  sky.addColorStop(1, '#3a2433')
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)
  const sun = ctx.createRadialGradient(x + w * 0.7, y + h * 0.62, 0, x + w * 0.7, y + h * 0.62, w * 0.35)
  sun.addColorStop(0, 'rgba(255,214,150,0.75)')
  sun.addColorStop(1, 'rgba(255,214,150,0)')
  ctx.fillStyle = sun
  ctx.fillRect(x, y, w, h)
  // TV tower
  const tx = x + w * 0.38
  ctx.fillStyle = '#1b1624'
  ctx.fillRect(tx - w * 0.012, y + h * 0.3, w * 0.024, h * 0.7)
  ctx.beginPath()
  ctx.arc(tx, y + h * 0.36, w * 0.045, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(tx - w * 0.004, y + h * 0.1, w * 0.008, h * 0.22)
  // buildings
  const roofs = [0.62, 0.7, 0.58, 0.74, 0.66, 0.6, 0.72, 0.64]
  roofs.forEach((ry, i) => {
    const bx = x + (w / roofs.length) * i
    ctx.fillStyle = i % 2 ? '#241b2c' : '#2a2033'
    ctx.fillRect(bx, y + h * ry, w / roofs.length + 1, h)
    ctx.fillStyle = 'rgba(255,205,130,0.55)'
    for (let wy = y + h * ry + 12; wy < y + h - 8; wy += 18)
      for (let wx = bx + 8; wx < bx + w / roofs.length - 8; wx += 16) if ((Math.floor(wx * 7 + wy * 3) % 5) < 2) ctx.fillRect(wx, wy, 5, 7)
  })
  ctx.restore()
}

/** a file card in the attach tray */
function fileCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, kind: 'photo' | 'doc', name: string, note: string, noteColor: string, busy: boolean, t: number) {
  panel(ctx, x, y, w, 58, 10, C.panel, C.line2)
  if (kind === 'photo') photo(ctx, x + 9, y + 9, 40, 40, 6)
  else {
    panel(ctx, x + 9, y + 9, 40, 40, 6, C.panel, C.line2)
    if (busy) spinner(ctx, x + 29, y + 29, 8, t)
    else pageIcon(ctx, x + 29, y + 29, 9, C.dim)
  }
  text(ctx, name, x + 60, y + 25, { size: 15, color: C.fg })
  text(ctx, note, x + 60, y + 45, { size: 11.5, family: MONO, color: noteColor })
  text(ctx, '×', x + w - 18, y + 34, { size: 18, color: C.dim, align: 'center' })
}

const CLIP = new Path2D('m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48')

const META = [
  { k: 'GPS location', v: '52.5200, 13.4050' },
  { k: 'camera', v: 'Apple iPhone 15 Pro' },
  { k: 'date taken', v: '2026-10-05 14:22' },
]

type Seg = { s: string; tag?: string }
/** the PDF's text, exactly as NULL Chat shielded it */
const DOC: Seg[][] = [
  [{ s: 'Tenancy agreement' }],
  [{ s: 'Landlord: ' }, { s: 'Jonas Weber', tag: '[NAME_2]' }, { s: ', ' }, { s: 'Siemensstrasse 4, 80333 Munich', tag: '[PLACE_1]' }],
  [{ s: 'Tenant: ' }, { s: 'Laura Schmidt', tag: '[NAME_1]' }, { s: ', ' }, { s: 'laura.schmidt@example.com', tag: '[EMAIL_1]' }, { s: ', ' }, { s: '+49 151 2345 6789', tag: '[PHONE_1]' }],
  [{ s: 'Rent: 1,250 EUR per month, paid to IBAN ' }, { s: 'DE89 3704 0044 0532 0130 00', tag: '[IBAN_1]' }],
  [{ s: 'Notice period: three months, in writing.' }],
]

type ASeg = { s: string; tag?: string; real?: string; morph?: number }
const ANSWER: ASeg[][] = [
  [{ s: 'Three months, and it has to be in writing.' }],
  [{ s: 'Send the notice to ' }, { s: '', tag: '[NAME_2]', real: 'Jonas Weber', morph: 0 }, { s: ' at ' }],
  [{ s: '', tag: '[PLACE_1]', real: 'Siemensstrasse 4, 80333 Munich', morph: 1 }, { s: '.' }],
]

function app(ctx: CanvasRenderingContext2D, t: number) {
  const a = win(t, 3.1, 19.7, 0.5, 0.45)
  if (!a) return
  const K = FILES_CUES
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
  if (t >= K.send) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.roundRect(X + 16, Y + 150, 308, 64, 8)
    ctx.fill()
    text(ctx, 'What is the notice period?', X + 32, Y + 178, { size: 17, color: C.fg })
    text(ctx, 'Claude Sonnet 5.5 · just now', X + 32, Y + 202, { size: 13, family: MONO, color: C.dim })
  } else text(ctx, 'Your chats stay in this browser.', X + 170, Y + 186, { size: 16, color: C.dim, align: 'center' })
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
  const BY = Y + H - 150
  const sent = t >= K.send

  // empty chat
  const ea = 1 - prog(t, K.photo - 0.4, K.photo)
  if (ea > 0) {
    ctx.save()
    ctx.globalAlpha *= ea
    nullMark(ctx, mid, Y + 250, 26, 1, 1, 5)
    text(ctx, 'Ask privately.', mid, Y + 340, { size: 46, weight: 500, align: 'center', spacing: '-1.5px' })
    text(ctx, 'Attach PDFs, text files or photos: opened in your browser', mid, Y + 394, { size: 18, family: MONO, color: C.dim, align: 'center' })
    ctx.restore()
  }

  // ── the photo, and what hides in it ──
  const pa = win(t, K.photo, K.doc, 0.45, 0.35)
  if (pa > 0) {
    ctx.save()
    ctx.globalAlpha *= pa
    const PY = Y + 120 + (1 - easeOut(prog(t, K.photo, K.photo + 0.5))) * 16
    panel(ctx, CX, PY, CW, 440, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, PHOTO_NAME, CX + 30, PY + 46, { size: 14, family: MONO, color: C.dim, spacing: '0.06em' })
    photo(ctx, CX + 30, PY + 70, 450, 300)
    // the redraw: a beam rebuilds the picture
    const r = prog(t, K.redraw[0], K.redraw[1])
    if (r > 0 && r < 1) {
      const sy = PY + 70 + 300 * easeInOut(r)
      const g = ctx.createLinearGradient(0, sy - 50, 0, sy)
      g.addColorStop(0, `rgba(${OK_RGB},0)`)
      g.addColorStop(1, `rgba(${OK_RGB},0.25)`)
      ctx.fillStyle = g
      ctx.fillRect(CX + 30, sy - 50, 450, 50)
      ctx.fillStyle = `rgba(${OK_RGB},0.9)`
      ctx.fillRect(CX + 30, sy, 450, 2)
    }
    // "EXIF" badge on the picture until it's redrawn
    const ba = 1 - prog(t, K.redraw[0] + 0.3, K.redraw[1])
    if (ba > 0) {
      ctx.save()
      ctx.globalAlpha *= ba
      ctx.beginPath()
      ctx.roundRect(CX + 44, PY + 84, 64, 26, 6)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fill()
      text(ctx, 'EXIF', CX + 76, PY + 102, { size: 13, family: MONO, color: C.warn, align: 'center', spacing: '0.12em' })
      ctx.restore()
    }
    text(ctx, 'HIDDEN IN THE FILE', CX + 530, PY + 100, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    META.forEach((m, i) => {
      const ra = easeOut(prog(t, K.rows[i], K.rows[i] + 0.3))
      if (!ra) return
      const y = PY + 160 + i * 66
      const gone = prog(t, K.removed[i], K.removed[i] + 0.35)
      ctx.save()
      ctx.globalAlpha *= ra
      text(ctx, m.k, CX + 530, y, { size: 16, family: MONO, color: C.dim })
      const vw = text(ctx, m.v, CX + 700, y, { size: 24, weight: 500, color: gone ? C.dim : C.warn })
      if (gone > 0) {
        ctx.fillStyle = C.dim
        ctx.fillRect(CX + 700, y - 8, vw * easeOut(gone), 2)
        text(ctx, 'removed', CX + 710 + vw + 18, y, { size: 15, family: MONO, color: C.ok, alpha: gone })
        check(ctx, CX + 710 + vw + 104, y - 6, 12, C.ok, 2.2)
      }
      ctx.restore()
    })
    const ca = easeOut(prog(t, K.removed[2] + 0.4, K.removed[2] + 0.9))
    text(ctx, 'redrawn in your browser · only the pixels go to the AI', CX + 530, PY + 380, { size: 16, family: MONO, color: C.ok, alpha: ca })
    ctx.restore()
  }

  // ── the document, as the AI sees it ──
  const da = win(t, K.doc, K.typeStart - 0.1, 0.45, 0.35)
  if (da > 0) {
    ctx.save()
    ctx.globalAlpha *= da
    const PY = Y + 120 + (1 - easeOut(prog(t, K.doc, K.doc + 0.5))) * 16
    panel(ctx, CX, PY, CW, 440, 16, 'rgba(255,255,255,0.02)', C.line2)
    text(ctx, 'WHAT THE AI SEES', CX + 30, PY + 46, { size: 14, family: MONO, color: C.dim, spacing: '0.16em' })
    let si = 0
    const swap = () => prog(t, K.swaps[si], K.swaps[si] + 0.3)
    // the document tag, file name included
    {
      let x = CX + 30
      const y = PY + 96
      x += text(ctx, '<document name="', x, y, { size: 19, family: MONO, color: C.muted })
      const p = swap()
      si++
      if (p < 1) {
        const w = measure(ctx, 'Laura Schmidt', { size: 19, family: MONO })
        text(ctx, 'Laura Schmidt', x, y, { size: 19, family: MONO, color: C.ok, alpha: 1 - p })
        if (p > 0) tagPill(ctx, '[NAME_1]', x, y, 19, p)
        x += w * (1 - p) + measure(ctx, '[NAME_1]', { size: 19, family: MONO }) * p
      } else x += tagPill(ctx, '[NAME_1]', x, y, 19) + 2
      text(ctx, ' lease.pdf">', x, y, { size: 19, family: MONO, color: C.muted })
    }
    DOC.forEach((line, li) => {
      let x = CX + 30
      const y = PY + 146 + li * 46
      line.forEach((seg) => {
        if (!seg.tag) {
          x += text(ctx, seg.s, x, y, { size: 23, color: C.soft })
          return
        }
        const p = swap()
        si++
        if (p < 1) {
          const w = measure(ctx, seg.s, { size: 23 })
          text(ctx, seg.s, x, y, { size: 23, color: C.ok, alpha: 1 - p })
          if (p > 0) tagPill(ctx, seg.tag, x, y, 21, p)
          x += w * (1 - p) + measure(ctx, seg.tag, { size: 21, family: MONO }) * p
        } else x += tagPill(ctx, seg.tag, x, y, 21) + 4
      })
    })
    text(ctx, '</document>', CX + 30, PY + 146 + DOC.length * 46, { size: 19, family: MONO, color: C.muted })
    const fa = easeOut(prog(t, K.swaps[6] + 0.5, K.swaps[6] + 1.0))
    text(ctx, 'only the text is sent · the file and its author (Laura Schmidt) stay in your browser', CX + 30, PY + 410, {
      size: 15,
      family: MONO,
      color: C.ok,
      alpha: fa,
    })
    ctx.restore()
  }

  // ── after sending: the message with its files, and the answer ──
  if (sent) {
    const ua = easeOut(prog(t, K.send, K.send + 0.3))
    ctx.save()
    ctx.globalAlpha *= ua
    const q = 'What is the notice period?'
    const qw = measure(ctx, q, { size: 21 }) + 44
    // files above the bubble
    photo(ctx, CX + CW - 300 - 12 - 230, Y + 110, 230, 150, 12)
    panel(ctx, CX + CW - 300, Y + 110, 300, 72, 12, 'rgba(255,255,255,0.03)', C.line2)
    pageIcon(ctx, CX + CW - 272, Y + 146, 10, C.dim)
    text(ctx, DOC_NAME, CX + CW - 248, Y + 140, { size: 16, color: C.fg })
    text(ctx, '1 page · 248 chars · ', CX + CW - 248, Y + 164, { size: 12, family: MONO, color: C.dim })
    text(ctx, '7 hidden', CX + CW - 248 + measure(ctx, '1 page · 248 chars · ', { size: 12, family: MONO }), Y + 164, { size: 12, family: MONO, color: C.ok })
    ctx.beginPath()
    ctx.roundRect(CX + CW - qw, Y + 276, qw, 52, 18)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.strokeStyle = C.line2
    ctx.stroke()
    text(ctx, q, CX + CW - qw + 22, Y + 309, { size: 21, color: C.fg })
    const note = 'cleaned in your browser · GPS location, camera, date taken removed'
    const nw = measure(ctx, note, { size: 13, family: MONO })
    shieldIcon(ctx, CX + CW - nw - 16, Y + 351, 7, C.ok)
    text(ctx, note, CX + CW - nw, Y + 356, { size: 13, family: MONO, color: C.ok })
    ctx.restore()

    const AY = Y + 410
    panel(ctx, CX, AY - 6, 40, 40, 8, C.panel, C.line2)
    nullMark(ctx, CX + 20, AY + 14, 8, 1, 1, 2.5)
    if (t < K.streamStart) {
      spinner(ctx, CX + 74, AY + 12, 9, t)
      text(ctx, 'Routing privately…', CX + 98, AY + 19, { size: 17, family: MONO, color: C.soft })
    } else {
      const total = ANSWER.reduce((n, l) => n + l.reduce((m, s) => m + (s.tag ?? s.s).length, 0), 0)
      let budget = Math.floor(prog(t, K.streamStart, K.streamEnd) * total)
      ANSWER.forEach((line, li) => {
        let x = CX + 70
        const y = AY + 22 + li * 42
        for (const seg of line) {
          if (budget <= 0) break
          if (seg.tag) {
            const take = Math.min(budget, seg.tag.length)
            budget -= seg.tag.length
            const m = seg.morph != null ? prog(t, K.morph[seg.morph], K.morph[seg.morph] + 0.4) : 0
            if (take < seg.tag.length) x += text(ctx, seg.tag.slice(0, take), x, y, { size: 22, family: MONO, color: C.eth })
            else if (m <= 0) x += tagPill(ctx, seg.tag, x, y, 21) + 4
            else {
              const tw = measure(ctx, seg.tag, { size: 21, family: MONO })
              const rw = measure(ctx, seg.real!, { size: 24 })
              if (m < 1) tagPill(ctx, seg.tag, x, y, 21, 1 - m)
              ctx.save()
              ctx.globalAlpha *= m
              ctx.fillStyle = `rgba(${OK_RGB},${0.14 * (1 - prog(t, K.morph[seg.morph!] + 0.4, K.morph[seg.morph!] + 1.4))})`
              ctx.beginPath()
              ctx.roundRect(x - 3, y - 22, rw + 6, 30, 5)
              ctx.fill()
              text(ctx, seg.real!, x, y, { size: 24, color: C.fg })
              ctx.restore()
              x += tw + (rw - tw) * m + 4 * (1 - m)
            }
          } else {
            const take = Math.min(budget, seg.s.length)
            budget -= seg.s.length
            x += text(ctx, seg.s.slice(0, take), x, y, { size: 24, color: C.soft })
          }
        }
      })
      const ma = easeOut(prog(t, K.streamEnd, K.streamEnd + 0.4))
      if (ma > 0) {
        const my = AY + 22 + ANSWER.length * 42 + 14
        ctx.save()
        ctx.globalAlpha *= ma
        const m1 = 'Claude Sonnet 5.5 · 2.1s · '
        text(ctx, m1, CX + 70, my, { size: 15, family: MONO, color: C.dim })
        let mx = CX + 70 + measure(ctx, m1, { size: 15, family: MONO })
        shieldIcon(ctx, mx + 8, my - 5, 7, C.ok)
        text(ctx, 'shield · ', mx + 20, my, { size: 15, family: MONO, color: C.ok })
        mx += 20 + measure(ctx, 'shield · ', { size: 15, family: MONO })
        text(ctx, 'paid privately', mx, my, { size: 15, family: MONO, color: C.ok })
        check(ctx, mx + measure(ctx, 'paid privately', { size: 15, family: MONO }) + 14, my - 5, 13, C.ok, 2.2)
        text(ctx, 'filled back in on your device', CX + 70, my + 30, { size: 15, family: MONO, color: C.faint, alpha: easeOut(prog(t, K.morph[1] + 0.4, K.morph[1] + 0.9)) })
        ctx.restore()
      }
    }
  }

  // ── attach tray + shield bar (before sending) ──
  const dropped = t >= K.drag[1]
  if (dropped && !sent) {
    const cards: { kind: 'photo' | 'doc'; name: string; at: number; ready: number; note: string; x: number; w: number }[] = [
      { kind: 'photo', name: PHOTO_NAME, at: K.drag[1] + 0.05, ready: K.ready[0], note: 'GPS location (52.5200, 13.4050) removed +2', x: 0, w: 400 },
      { kind: 'doc', name: DOC_NAME, at: K.drag[1] + 0.2, ready: K.ready[1], note: '1 page · 248 chars · ~62 tokens', x: 412, w: 330 },
    ]
    cards.forEach((c) => {
      const ca = easeOut(prog(t, c.at, c.at + 0.3))
      if (!ca) return
      ctx.save()
      ctx.globalAlpha *= ca
      const busy = t < c.ready
      fileCard(ctx, CX + c.x, BY - 84 + (1 - ca) * 14, c.w, c.kind, c.name, busy ? 'opening in your browser…' : c.note, busy ? C.dim : c.kind === 'photo' ? C.ok : C.dim, busy, t)
      ctx.restore()
    })
    const sa = easeOut(prog(t, K.ready[1] + 0.3, K.ready[1] + 0.7))
    if (sa > 0) {
      ctx.save()
      ctx.globalAlpha *= sa
      const y = BY - 108
      let x = CX
      shieldIcon(ctx, x + 8, y - 5, 8, C.ok)
      x += 22
      x += text(ctx, 'SHIELD', x, y, { size: 14, family: MONO, color: C.ok, spacing: '0.12em' }) + 14
      x += text(ctx, '7 of 7 hidden from the AI', x, y, { size: 14, family: MONO, color: C.dim }) + 14
      const label = `${DOC_NAME} · 7 hidden`
      const w = measure(ctx, label, { size: 13, family: MONO }) + 40
      ctx.beginPath()
      ctx.roundRect(x, y - 18, w, 26, 6)
      ctx.fillStyle = `rgba(${OK_RGB},0.07)`
      ctx.fill()
      ctx.strokeStyle = `rgba(${OK_RGB},0.35)`
      ctx.lineWidth = 1.2
      ctx.stroke()
      pageIcon(ctx, x + 15, y - 5, 6, C.ok)
      text(ctx, label, x + 28, y, { size: 13, family: MONO, color: C.ok })
      ctx.restore()
    }
  }

  // composer
  const dropGlow = win(t, K.drag[0] + 0.3, K.drag[1] + 0.5, 0.2, 0.4)
  panel(ctx, CX, BY, CW, 96, 14, dropGlow ? `rgba(${OK_RGB},${0.04 * dropGlow})` : C.panel, dropGlow ? `rgba(${OK_RGB},${0.2 + 0.4 * dropGlow})` : C.line2)
  const btn = (bx: number, w: number, label: string, on: boolean, icon?: 'clip' | 'shield') => {
    ctx.beginPath()
    ctx.roundRect(bx, BY + 26, w, 44, 10)
    ctx.fillStyle = on ? `rgba(${OK_RGB},0.08)` : 'rgba(0,0,0,0)'
    ctx.fill()
    ctx.strokeStyle = on ? `rgba(${OK_RGB},0.4)` : C.line2
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (icon === 'shield') shieldIcon(ctx, bx + 22, BY + 48, 8, C.ok)
    if (icon === 'clip') {
      // the paperclip icon the app uses (24×24 path)
      ctx.save()
      ctx.translate(bx + 12, BY + 37)
      ctx.scale(0.95, 0.95)
      ctx.strokeStyle = on ? C.ok : C.dim
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(CLIP)
      ctx.restore()
    }
    text(ctx, label, icon ? bx + 40 : bx + w / 2, BY + 54, { size: 14, family: MONO, color: on ? C.ok : C.dim, align: icon ? 'left' : 'center', spacing: '0.08em' })
  }
  const nFiles = dropped && !sent ? 2 : 0
  btn(CX + 12, nFiles ? 62 : 46, nFiles ? '2' : '', nFiles > 0, 'clip')
  btn(CX + (nFiles ? 84 : 68), 74, 'WEB', false)
  btn(CX + (nFiles ? 166 : 150), 92, 'IMAGE', false)
  btn(CX + (nFiles ? 266 : 250), 112, 'SHIELD', true, 'shield')
  const TX = CX + 400
  if (!sent) {
    const q = 'What is the notice period?'
    const n = Math.floor(prog(t, K.typeStart, K.typeEnd) * q.length)
    if (n <= 0) text(ctx, dropped && t >= K.ready[1] ? 'Ask about your files…' : 'Ask privately…', TX, BY + 56, { size: 21, color: C.dim })
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

  // the drag: two files carried in from the right
  const dg = prog(t, K.drag[0], K.drag[1])
  const da2 = win(t, K.drag[0] - 0.2, K.drag[1] + 0.15, 0.2, 0.15)
  if (da2 > 0) {
    const sx = X + W + 60
    const sy = Y + 380
    const ex = CX + 520
    const ey = BY + 30
    const e = easeInOut(dg)
    const px = sx + (ex - sx) * e
    const py = sy + (ey - sy) * e
    ctx.save()
    ctx.globalAlpha *= da2
    panel(ctx, px + 18, py + 14, 150, 44, 8, 'rgba(14,14,17,0.92)', C.line3)
    pageIcon(ctx, px + 38, py + 36, 8, C.soft)
    text(ctx, '2 files', px + 56, py + 42, { size: 15, family: MONO, color: C.soft })
    photo(ctx, px + 8, py + 4, 34, 34, 5)
    ctx.restore()
    pointer(ctx, px, py, da2)
  }
  ctx.restore()
}

const POINTS = [
  { k: 'DOCUMENTS', v: 'PDF, text, CSV, code', s: 'read in your browser, sent as text' },
  { k: 'PHOTOS', v: 'GPS, camera, date: gone', s: 'redrawn before they are sent' },
  { k: 'SHIELDED', v: 'Names, emails, IBANs', s: 'swapped for placeholders, file names too' },
]

function summary(ctx: CanvasRenderingContext2D, t: number) {
  const K = FILES_CUES
  const a = win(t, 19.5, K.end, 0.45, 0.45)
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  text(ctx, 'PRIVATE FILES', 960, 230, { size: 20, family: MONO, color: C.muted, align: 'center', spacing: '0.18em' })
  text(ctx, 'Cleaned before they leave your browser.', 960, 300, { size: 54, weight: 500, align: 'center', spacing: '-1.5px' })
  POINTS.forEach((p, i) => {
    const pa = easeOut(prog(t, K.points[i] - 0.4, K.points[i]))
    if (!pa) return
    const x = 120 + i * 570
    const y = 420 - (1 - pa) * 14
    ctx.save()
    ctx.globalAlpha *= pa
    panel(ctx, x, y, 540, 260, 18, C.panel, `rgba(${OK_RGB},0.3)`)
    text(ctx, p.k, x + 36, y + 58, { size: 16, family: MONO, color: C.ok, spacing: '0.16em' })
    text(ctx, p.v, x + 36, y + 136, { size: 36, weight: 600, spacing: '-1px' })
    text(ctx, p.s, x + 36, y + 196, { size: 18, family: MONO, color: C.muted })
    check(ctx, x + 490, y + 52, 16, C.ok, 2.4)
    ctx.restore()
  })
  text(ctx, 'up to 4 files per message · the AI still sees what is in a photo', 960, 790, {
    size: 18,
    family: MONO,
    color: C.dim,
    align: 'center',
    alpha: easeOut(prog(t, K.points[2] + 0.5, K.points[2] + 1.0)),
  })
  ctx.restore()
}

function endCard(ctx: CanvasRenderingContext2D, t: number) {
  const K = FILES_CUES
  const a = easeOut(prog(t, K.end + 0.1, K.end + 0.8))
  if (!a) return
  ctx.save()
  ctx.globalAlpha = a
  glow(ctx, 960, 330, 420, OK_RGB, 0.06)
  nullMark(ctx, 960, 320, 84, 1, 1, 18)
  text(ctx, 'Your files. Cleaned before they leave.', 960, 540, { size: 76, weight: 600, align: 'center', spacing: '-3px' })
  text(ctx, 'Private Files, live in NULL Chat. Tap the paperclip.', 960, 610, { size: 32, color: C.muted, align: 'center' })
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

export function drawFiles(ctx: CanvasRenderingContext2D, w: number, _h: number, t: number) {
  const s = w / 1920
  ctx.save()
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 1920, 1080)
  grid(ctx, 0.35 + 0.4 * clamp(t / 1.2))
  network(ctx, t, 0.25)
  title(ctx, t)
  app(ctx, t)
  summary(ctx, t)
  endCard(ctx, t)
  softEdges(ctx)
  ctx.restore()
}

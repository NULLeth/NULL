import type { Worker } from 'tesseract.js'
import { mergeHits } from './aiShield'
import { detect, KIND_LABEL, type ShieldHit, type ShieldKind } from './shield'

/**
 * Screenshot Shield: reads the text in an attached picture with Tesseract (OCR, in a web
 * worker; runtime and English model are served from this site, see scripts/ocr-assets.mjs),
 * finds personal details in that text the same way Prompt Shield does for a message, and
 * covers exactly those words with solid boxes. The box carries the kind ("EMAIL") so the
 * model still knows what was there.
 */

export interface TextBox {
  x: number
  y: number
  w: number
  h: number
  kind: ShieldKind
}

export interface Covered {
  kind: ShieldKind
  value: string
}

let worker: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  worker ??= (async () => {
    const { createWorker, OEM } = await import('tesseract.js')
    return createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
      gzip: true,
      workerBlobURL: false,
    })
  })().catch((e) => {
    worker = null
    throw e
  })
  return worker
}

interface Word {
  start: number
  end: number
  x0: number
  y0: number
  x1: number
  y1: number
  line: number
}

/** Typical OCR slips in the details that matter, fixed without changing the length ("©x71C…" → "0x71C…"). */
function fixOcr(s: string): string {
  let t = s.replace(/^[©®OoQD]([xX])(?=[0-9a-fA-FOo]{20,})/, '0$1')
  if (/^0[xX][0-9a-fA-FOo]{38,}/.test(t)) t = t.slice(0, 2) + t.slice(2).replace(/[Oo]/g, '0')
  return t
}

/**
 * Personal details written in a picture, and where they are.
 * `ai` adds AI Shield's people/places/companies when it is switched on.
 */
export async function findTextDetails(
  canvas: HTMLCanvasElement,
  opts: { words?: string[]; ai?: (text: string) => Promise<ShieldHit[]> } = {},
): Promise<{ boxes: TextBox[]; covered: Covered[] }> {
  const w = await getWorker()
  const { data } = await w.recognize(canvas, {}, { blocks: true, text: false })
  // the page's words, line by line, with where each sits in the joined text. Every word
  // counts: Tesseract gives emails and wallet addresses ~0 confidence (no dictionary has them).
  const words: Word[] = []
  let text = ''
  let hits: ShieldHit[] = []
  let line = 0
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs)
      for (const l of para.lines) {
        const at = text.length
        let s = ''
        let prev: { text: string; x1: number } | null = null
        for (const wd of l.words) {
          const t = fixOcr(wd.text.trim())
          if (!t) continue
          // "alice." + "morgan@x.com" read as two words: glue them back when they touch
          const tight = prev && wd.bbox.x0 - prev.x1 < (wd.bbox.y1 - wd.bbox.y0) * 0.4 && (/[._@+-]$/.test(prev.text) || /^[._@-]/.test(t))
          if (prev && !tight) s += ' '
          // the line's height, so every box on it is the same size
          words.push({ start: at + s.length, end: at + s.length + t.length, x0: wd.bbox.x0, x1: wd.bbox.x1, y0: Math.min(wd.bbox.y0, l.bbox.y0), y1: Math.max(wd.bbox.y1, l.bbox.y1), line })
          s += t
          prev = { text: t, x1: wd.bbox.x1 }
        }
        // patterns run per line, so a match never runs into the next line's label
        hits.push(...detect(s, opts.words ?? []).map((h) => ({ ...h, start: h.start + at, end: h.end + at })))
        text += `${s}\n`
        line++
      }
  if (!text.trim()) return { boxes: [], covered: [] }
  if (opts.ai) hits = mergeHits(hits, await opts.ai(text).catch(() => []))
  const boxes: TextBox[] = []
  const covered: Covered[] = []
  for (const h of hits) {
    // one box per line the detail runs over
    const byLine = new Map<number, TextBox>()
    for (const wd of words) {
      if (wd.end <= h.start || wd.start >= h.end) continue
      // cover only the part of a word the detail spans ("mail:alice@x.com" → just the address)
      const len = wd.end - wd.start
      const from = Math.max(0, h.start - wd.start) / len
      const to = Math.min(len, h.end - wd.start) / len
      const x0 = wd.x0 + (wd.x1 - wd.x0) * from
      const x1 = wd.x0 + (wd.x1 - wd.x0) * to
      const b = byLine.get(wd.line)
      if (!b) byLine.set(wd.line, { x: x0, y: wd.y0, w: x1 - x0, h: wd.y1 - wd.y0, kind: h.kind })
      else {
        const right = Math.max(b.x + b.w, x1)
        const bottom = Math.max(b.y + b.h, wd.y1)
        b.x = Math.min(b.x, x0)
        b.y = Math.min(b.y, wd.y0)
        b.w = right - b.x
        b.h = bottom - b.y
      }
    }
    if (!byLine.size) continue
    boxes.push(...byLine.values())
    covered.push({ kind: h.kind, value: h.value })
  }
  return { boxes, covered }
}

/** A copy of the picture with each detail covered by a box that names its kind. */
export function coverText(src: HTMLCanvasElement, boxes: TextBox[]): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  for (const b of boxes) {
    const pad = Math.max(2, b.h * 0.18)
    const x = b.x - pad
    const y = b.y - pad
    const w = b.w + pad * 2
    const h = b.h + pad * 2
    ctx.fillStyle = '#16161a'
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, Math.min(6, h / 4))
    ctx.fill()
    const label = KIND_LABEL[b.kind].toUpperCase()
    const size = Math.max(8, Math.min(h * 0.55, 22))
    ctx.font = `600 ${size}px ui-monospace, monospace`
    if (ctx.measureText(label).width < w - 6) {
      ctx.fillStyle = '#9aa3ff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x + w / 2, y + h / 2 + 1)
    }
  }
  return out
}

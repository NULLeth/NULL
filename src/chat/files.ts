/**
 * Private Files: documents and photos are opened in this browser. NULL never uploads them
 * anywhere. A document becomes plain text (PDFs with pdf.js), so only its text reaches the
 * model, and that text goes through Prompt Shield like a message. A photo is redrawn on a
 * canvas, which keeps the pixels and drops everything else: GPS location, camera, date taken.
 * Faces in it are blurred (Face Shield, faces.ts) and personal details written in it, like an
 * email or a wallet address on a screenshot, are covered (Screenshot Shield, ocr.ts). The model
 * still sees the rest of the picture.
 */

import { blurFaces, findFaces } from './faces'
import { coverText, findTextDetails, type Covered } from './ocr'
import type { ShieldHit } from './shield'

export interface DocFile {
  kind: 'doc'
  name: string
  text: string
  pages?: number
  /** the text was cut at MAX_DOC_CHARS */
  truncated?: boolean
  /** file details that stay behind (only the text is sent) */
  removed: string[]
}

export interface PhotoFile {
  kind: 'photo'
  name: string
  dataUrl: string
  mime: string
  width: number
  height: number
  /** hidden data found in the original and dropped by redrawing it */
  removed: string[]
  /** faces found by Face Shield */
  faces: number
  /** personal details found in the picture's text by Screenshot Shield */
  covered: Covered[]
  /** cleaned copies with faces blurred, details covered, or both */
  variants: { faces?: string; text?: string; both?: string }
  /** a check could not run (the photo is still cleaned of metadata) */
  faceCheckFailed?: boolean
  textCheckFailed?: boolean
}

/** What a photo goes out as, given the two switches on its card. */
export function photoUrl(f: PhotoFile, blur: boolean, cover: boolean): string {
  const v = f.variants
  if (blur && cover && v.both) return v.both
  if (blur && v.faces) return v.faces
  if (cover && v.text) return v.text
  return f.dataUrl
}

/** Prompt Shield settings for reading the text in a picture. */
export interface ReadOptions {
  words?: string[]
  ai?: (text: string) => Promise<ShieldHit[]>
}

export type ReadFile = DocFile | PhotoFile

/** per document: ~12k tokens, so a few pages of a long PDF rather than a whole book */
export const MAX_DOC_CHARS = 50_000
export const MAX_FILES = 4
/** long edge of a photo sent to the model: plenty for reading, far fewer tokens than 4K */
const PHOTO_EDGE = 1600

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|jsonl|log|xml|html?|ya?ml|toml|ini|cfg|conf|sql|sh|ps1|py|js|mjs|ts|tsx|jsx|sol|go|rs|java|kt|c|h|cpp|hpp|cs|rb|php|swift|r|tex|srt|vtt)$/i
export const ACCEPT = 'application/pdf,.pdf,text/*,.md,.csv,.tsv,.json,.jsonl,.log,.xml,.yaml,.yml,.toml,.sql,.py,.js,.ts,.tsx,.sol,.go,.rs,.java,.c,.cpp,.rb,.php,.swift,image/jpeg,image/png,image/webp,image/gif,image/avif'

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
const isPhoto = (f: File) => /^image\/(jpeg|png|webp|gif|avif)$/.test(f.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name)
const isText = (f: File) => f.type.startsWith('text/') || TEXT_EXT.test(f.name) || f.type === 'application/json'

export const fileKind = (f: File): 'doc' | 'photo' | null => (isPhoto(f) ? 'photo' : isPdf(f) || isText(f) ? 'doc' : null)

/** Opens one file in the browser: text out of a document, a clean copy of a photo. */
export async function readFile(file: File, opts: ReadOptions = {}): Promise<ReadFile> {
  if (isPhoto(file)) return readPhoto(file, opts)
  if (isPdf(file)) return readPdf(file)
  if (isText(file)) {
    const raw = (await file.text()).replace(/\r\n?/g, '\n')
    if (raw.includes('\u0000')) throw new Error('This file is not plain text.')
    if (!raw.trim()) throw new Error('This file is empty.')
    return { kind: 'doc', name: file.name, ...cut(raw), removed: [] }
  }
  if (/\.docx?$/i.test(file.name)) throw new Error('Word files are not supported yet: save it as PDF and attach that.')
  if (/\.hei[cf]$/i.test(file.name)) throw new Error('HEIC photos can’t be opened by most browsers: export it as JPG first.')
  throw new Error('Only PDFs, text files and photos can be attached.')
}

const cut = (text: string) => (text.length > MAX_DOC_CHARS ? { text: text.slice(0, MAX_DOC_CHARS), truncated: true } : { text })

// ── PDF ──────────────────────────────────────────────────────────────────────

async function readPdf(file: File): Promise<DocFile> {
  const [pdfjs, { default: workerSrc }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableFontFace: true, useSystemFonts: false, stopAtErrors: false })
  const doc = await task.promise.catch(() => {
    throw new Error('This PDF could not be opened. Is it password-protected?')
  })
  try {
    const pages: string[] = []
    let length = 0
    for (let n = 1; n <= doc.numPages && length < MAX_DOC_CHARS; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      let s = ''
      for (const item of content.items) {
        if (!('str' in item)) continue
        s += item.str + (item.hasEOL ? '\n' : item.str && !item.str.endsWith(' ') ? ' ' : '')
      }
      s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
      pages.push(s)
      length += s.length
    }
    const text = pages.filter(Boolean).join('\n\n')
    if (!text.trim()) throw new Error('No text found in this PDF. Is it a scan? Scans have no text layer to read.')
    const removed: string[] = []
    try {
      const { info } = (await doc.getMetadata()) as { info?: Record<string, unknown> }
      const author = typeof info?.Author === 'string' ? info.Author.trim() : ''
      const app = typeof info?.Creator === 'string' ? info.Creator.trim() : ''
      if (author) removed.push(`author (${author})`)
      if (app) removed.push(`made with (${app})`)
    } catch {
      /* no metadata */
    }
    const c = cut(text)
    return { kind: 'doc', name: file.name, ...c, truncated: c.truncated || pages.length < doc.numPages, pages: doc.numPages, removed }
  } finally {
    void task.destroy()
  }
}

// ── photos ───────────────────────────────────────────────────────────────────

async function readPhoto(file: File, opts: ReadOptions): Promise<PhotoFile> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const removed = hiddenData(bytes)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: file.type || 'image/jpeg' }), { imageOrientation: 'from-image' })
  } catch {
    throw new Error('This browser can’t open that photo. Try a JPG or PNG.')
  }
  const scale = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  // screenshots stay sharp as PNG; camera photos become JPEG
  const png = /png|gif/.test(file.type) || /\.(png|gif)$/i.test(file.name)
  if (!png) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const mime = png ? 'image/png' : 'image/jpeg'
  const [faceBoxes, text] = await Promise.all([findFaces(canvas).catch(() => null), findTextDetails(canvas, opts).catch(() => null)])
  const variants: PhotoFile['variants'] = {}
  const blurred = faceBoxes?.length ? blurFaces(canvas, faceBoxes) : null
  if (blurred) variants.faces = blurred.toDataURL(mime, 0.88)
  if (text?.boxes.length) {
    variants.text = coverText(canvas, text.boxes).toDataURL(mime, 0.88)
    if (blurred) variants.both = coverText(blurred, text.boxes).toDataURL(mime, 0.88)
  }
  return {
    kind: 'photo',
    name: file.name,
    dataUrl: canvas.toDataURL(mime, 0.88),
    mime,
    width,
    height,
    removed,
    faces: faceBoxes?.length ?? 0,
    covered: text?.covered ?? [],
    variants,
    faceCheckFailed: !faceBoxes,
    textCheckFailed: !text,
  }
}

/** What a photo carries besides its pixels, in plain words (JPEG EXIF in detail, other formats roughly). */
export function hiddenData(b: Uint8Array): string[] {
  const out: string[] = []
  const ascii = (from: number, n: number) => String.fromCharCode(...b.subarray(from, from + n))
  // JPEG: walk the segments up to the image data
  if (b[0] === 0xff && b[1] === 0xd8) {
    let p = 2
    let xmp = false
    while (p + 4 < b.length && b[p] === 0xff) {
      const marker = b[p + 1]
      const len = (b[p + 2] << 8) | b[p + 3]
      if (marker === 0xda) break
      if (marker === 0xe1 && ascii(p + 4, 4) === 'Exif') out.push(...exif(b, p + 10, p + 2 + len))
      else if (marker === 0xe1 && ascii(p + 4, 28).startsWith('http://ns.adobe.com/xap')) xmp = true
      p += 2 + len
    }
    if (xmp && !out.length) out.push('editing data (XMP)')
    return out
  }
  // PNG: text and EXIF chunks
  if (b[0] === 0x89 && ascii(1, 3) === 'PNG') {
    let p = 8
    while (p + 8 < b.length) {
      const len = ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0
      const type = ascii(p + 4, 4)
      if (type === 'eXIf') out.push(...exif(b, p + 8, p + 8 + len))
      else if ((type === 'tEXt' || type === 'iTXt' || type === 'zTXt') && !out.includes('text notes in the file')) out.push('text notes in the file')
      if (type === 'IEND') break
      p += 12 + len
    }
    return out
  }
  // WebP: EXIF/XMP chunks
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    let p = 12
    while (p + 8 < b.length) {
      const type = ascii(p, 4)
      const len = (b[p + 4] | (b[p + 5] << 8) | (b[p + 6] << 16) | (b[p + 7] << 24)) >>> 0
      if (type === 'EXIF') {
        const s = p + 8 + (ascii(p + 8, 4) === 'Exif' ? 6 : 0)
        out.push(...exif(b, s, p + 8 + len))
      } else if (type === 'XMP ' && !out.length) out.push('editing data (XMP)')
      p += 8 + len + (len & 1)
    }
  }
  return out
}

/** Reads the personal bits of an EXIF block (a TIFF structure from `start` to `end`). */
function exif(b: Uint8Array, start: number, end: number): string[] {
  if (start + 8 > end || end > b.length) return []
  const little = b[start] === 0x49
  const u16 = (o: number) => (little ? b[start + o] | (b[start + o + 1] << 8) : (b[start + o] << 8) | b[start + o + 1])
  const u32 = (o: number) =>
    (little
      ? b[start + o] | (b[start + o + 1] << 8) | (b[start + o + 2] << 16) | (b[start + o + 3] << 24)
      : (b[start + o] << 24) | (b[start + o + 1] << 16) | (b[start + o + 2] << 8) | b[start + o + 3]) >>> 0
  const inside = (o: number, n: number) => o >= 0 && start + o + n <= end
  type Entry = { type: number; count: number; at: number }
  const ifd = (o: number): Map<number, Entry> => {
    const m = new Map<number, Entry>()
    if (!inside(o, 2)) return m
    const n = u16(o)
    for (let i = 0; i < n && inside(o + 2 + i * 12, 12); i++) {
      const e = o + 2 + i * 12
      const type = u16(e + 2)
      const count = u32(e + 4)
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 1
      m.set(u16(e), { type, count, at: size * count > 4 ? u32(e + 8) : e + 8 })
    }
    return m
  }
  const str = (e?: Entry) => {
    if (!e || e.type !== 2 || !inside(e.at, e.count)) return ''
    let s = ''
    for (let i = 0; i < e.count; i++) {
      const c = b[start + e.at + i]
      if (!c) break
      s += String.fromCharCode(c)
    }
    return s.trim()
  }
  const rationals = (e?: Entry) => {
    if (!e || e.type !== 5 || !inside(e.at, e.count * 8)) return null
    return Array.from({ length: e.count }, (_, i) => {
      const d = u32(e.at + i * 8 + 4)
      return d ? u32(e.at + i * 8) / d : 0
    })
  }

  const out: string[] = []
  const ifd0 = ifd(u32(4))
  const gpsPtr = ifd0.get(0x8825)
  if (gpsPtr) {
    const gps = ifd(u32(gpsPtr.at))
    const lat = rationals(gps.get(2))
    const lon = rationals(gps.get(4))
    const deg = (v: number[] | null) => (v && v.length >= 3 ? v[0] + v[1] / 60 + v[2] / 3600 : null)
    const la = deg(lat)
    const lo = deg(lon)
    if (la != null && lo != null && (la || lo)) {
      const sLat = str(gps.get(1)) === 'S' ? -la : la
      const sLon = str(gps.get(3)) === 'W' ? -lo : lo
      out.push(`GPS location (${sLat.toFixed(4)}, ${sLon.toFixed(4)})`)
    } else if (gps.size) out.push('GPS data')
  }
  const make = str(ifd0.get(0x010f))
  const model = str(ifd0.get(0x0110))
  if (make || model) out.push(`camera (${model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`.trim()})`)
  const exifPtr = ifd0.get(0x8769)
  const sub = exifPtr ? ifd(u32(exifPtr.at)) : new Map<number, Entry>()
  const taken = str(sub.get(0x9003)) || str(ifd0.get(0x0132))
  if (taken) out.push(`date taken (${taken.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').slice(0, 16)})`)
  const owner = str(ifd0.get(0x013b)) || str(sub.get(0xa430))
  if (owner) out.push(`owner name (${owner})`)
  return out
}

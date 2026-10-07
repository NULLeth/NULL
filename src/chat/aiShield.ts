import { cachedBytes, loadOrt, type Ort } from './ort'
import type { ShieldHit, ShieldKind } from './shield'

/**
 * AI Shield: a small PII-detection model (BERT-small, 4 layers, ~29 MB) that runs in the
 * browser with onnxruntime-web (WebAssembly, no GPU needed). It finds people, places and
 * organisations that the pattern-based shield can't, like "lunch with Jonas at Siemens".
 *
 * The model, its vocabulary (public/models) and the runtime (bundled by Vite as assets) are
 * served from this site: nothing is fetched from a third party and no text ever leaves the browser.
 * The model is English-trained; other languages work only partly.
 */

const MODEL_URL = '/models/pii-small/model.quant.onnx'
const VOCAB_URL = '/models/pii-small/vocab.txt'
const CONFIG_URL = '/models/pii-small/config.json'
const CACHE = 'null-ai-shield-v1'
export const AI_MODEL_MB = 29

/** model labels → shield kinds; labels not listed (DATE_TIME, TITLE, URL, NRP…) are ignored */
const KIND: Record<string, ShieldKind> = {
  PERSON: 'NAME',
  LOCATION: 'PLACE',
  COORDINATE: 'PLACE',
  ORGANIZATION: 'ORG',
  AGE: 'AGE',
  EMAIL_ADDRESS: 'EMAIL',
  PHONE_NUMBER: 'PHONE',
  CREDIT_CARD: 'CARD',
  IBAN_CODE: 'IBAN',
  IP_ADDRESS: 'IP',
  PASSWORD: 'SECRET',
  FINANCIAL: 'ID',
  US_SSN: 'ID',
  US_PASSPORT: 'ID',
  US_DRIVER_LICENSE: 'ID',
  US_ITIN: 'ID',
  US_BANK_NUMBER: 'ID',
  US_LICENSE_PLATE: 'ID',
  IMEI: 'ID',
  MAC_ADDRESS: 'ID',
}
/** below this average confidence an entity is dropped */
const MIN_SCORE = 0.55
/** places and organisations are only personal next to a person or in a first-person message */
const CONTEXT_KINDS = new Set<ShieldKind>(['PLACE', 'ORG'])
const FIRST_PERSON = /\b(i|i'm|i've|i'd|i'll|me|my|mine|myself|we|we're|us|our|ours|ich|mich|mir|mein\w*|wir|uns|unser\w*)\b/i

interface Model {
  ort: Ort
  session: import('onnxruntime-web/wasm').InferenceSession
  vocab: Map<string, number>
  labels: string[]
}

let model: Promise<Model> | null = null

/** Loads the runtime and the model once; later calls reuse it. */
export function loadAiShield(onProgress?: (p: number) => void): Promise<Model> {
  model ??= (async () => {
    const ort = await loadOrt()
    const [bytes, vocabText, config] = await Promise.all([
      cachedBytes(CACHE, MODEL_URL, onProgress),
      fetch(VOCAB_URL).then((r) => r.text()),
      fetch(CONFIG_URL).then((r) => r.json() as Promise<{ id2label: Record<string, string> }>),
    ])
    const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'] })
    const vocab = new Map(vocabText.split(/\r?\n/).map((t, i) => [t, i] as [string, number]))
    const labels = Object.keys(config.id2label)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => config.id2label[k])
    return { ort, session, vocab, labels }
  })().catch((e) => {
    model = null
    throw e
  })
  return model
}

// ── BERT (uncased) tokenizer that keeps track of where every word sits in the text ──

interface Word {
  start: number
  end: number
  text: string
}

const isPunct = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0
  return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126) || /\p{P}/u.test(ch)
}

/** Whitespace/punctuation split like BERT's BasicTokenizer, with character offsets. */
function words(text: string): Word[] {
  const out: Word[] = []
  let start = -1
  const close = (i: number) => {
    if (start >= 0) out.push({ start, end: i, text: text.slice(start, i) })
    start = -1
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (/\s/.test(ch)) close(i)
    else if (isPunct(ch)) {
      close(i)
      out.push({ start: i, end: i + 1, text: ch })
    } else if (start < 0) start = i
  }
  close(text.length)
  return out
}

const normalize = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')

/** WordPiece ids for one word ([UNK] if it can't be split). */
function wordPiece(word: string, vocab: Map<string, number>): number[] {
  const unk = vocab.get('[UNK]') ?? 100
  if (word.length > 100) return [unk]
  const ids: number[] = []
  let start = 0
  while (start < word.length) {
    let end = word.length
    let id: number | undefined
    while (start < end) {
      const piece = (start > 0 ? '##' : '') + word.slice(start, end)
      id = vocab.get(piece)
      if (id !== undefined) break
      end--
    }
    if (id === undefined) return [unk]
    ids.push(id)
    start = end
  }
  return ids
}

const softmaxMax = (row: Float32Array) => {
  let max = -Infinity
  let arg = 0
  for (let i = 0; i < row.length; i++) if (row[i] > max) ((max = row[i]), (arg = i))
  let sum = 0
  for (let i = 0; i < row.length; i++) sum += Math.exp(row[i] - max)
  return { arg, p: 1 / sum }
}

/** People, places, organisations and other personal details the model finds in `text`. */
export async function detectAi(text: string): Promise<ShieldHit[]> {
  if (!text.trim()) return []
  const m = await loadAiShield()
  const ws = words(text)
  const cls = m.vocab.get('[CLS]') ?? 101
  const sep = m.vocab.get('[SEP]') ?? 102

  // each word keeps the label of its first word piece
  const wordLabel: { label: string; p: number }[] = []
  const pieces = ws.map((w) => wordPiece(normalize(w.text), m.vocab))
  const MAX = 500
  for (let w0 = 0; w0 < ws.length; ) {
    // a window of whole words that fits into 510 pieces
    const ids = [cls]
    const firstPiece: number[] = []
    let w = w0
    while (w < ws.length && ids.length + pieces[w].length <= MAX) {
      firstPiece.push(ids.length)
      ids.push(...pieces[w])
      w++
    }
    if (w === w0) {
      // a single enormous word: skip it
      wordLabel[w0] = { label: 'O', p: 1 }
      w0++
      continue
    }
    ids.push(sep)
    const n = ids.length
    const feeds: Record<string, import('onnxruntime-web/wasm').Tensor> = {}
    const t = (data: BigInt64Array) => new m.ort.Tensor('int64', data, [1, n])
    for (const name of m.session.inputNames) {
      if (name.includes('input_ids')) feeds[name] = t(BigInt64Array.from(ids, (x) => BigInt(x)))
      else if (name.includes('attention')) feeds[name] = t(new BigInt64Array(n).fill(1n))
      else if (name.includes('token_type')) feeds[name] = t(new BigInt64Array(n))
    }
    const out = await m.session.run(feeds)
    const logits = out[m.session.outputNames[0]].data as Float32Array
    const L = m.labels.length
    firstPiece.forEach((pi, k) => {
      const { arg, p } = softmaxMax(logits.subarray(pi * L, pi * L + L))
      wordLabel[w0 + k] = { label: m.labels[arg] ?? 'O', p }
    })
    w0 = w
  }

  // group B-/I- words into entities
  const hits: ShieldHit[] = []
  let cur: { type: string; from: number; to: number; ps: number[] } | null = null
  const flush = () => {
    if (!cur) return
    const kind = KIND[cur.type]
    const score = cur.ps.reduce((a, b) => a + b, 0) / cur.ps.length
    const start = ws[cur.from].start
    const end = ws[cur.to].end
    const value = text.slice(start, end)
    if (kind && score >= MIN_SCORE && value.replace(/\W/g, '').length >= 2) hits.push({ kind, start, end, value })
    cur = null
  }
  ws.forEach((_, i) => {
    const { label, p } = wordLabel[i] ?? { label: 'O', p: 1 }
    if (label === 'O') return flush()
    const [bio, type] = label.includes('-') ? (label.split('-', 2) as [string, string]) : ['B', label]
    if (cur && cur.type === type && bio === 'I' && cur.to === i - 1) {
      cur.to = i
      cur.ps.push(p)
    } else if (cur && cur.type === type && bio === 'I' && /^[\s'’.-]*$/.test(text.slice(ws[cur.to].end, ws[i].start))) {
      cur.to = i
      cur.ps.push(p)
    } else {
      flush()
      cur = { type, from: i, to: i, ps: [p] }
    }
  })
  flush()

  // "Dr." + "Emily" + "Carter" → one name
  const joined: ShieldHit[] = []
  for (const h of hits) {
    const prev = joined[joined.length - 1]
    if (prev && prev.kind === h.kind && /^[\s.'’-]{0,3}$/.test(text.slice(prev.end, h.start))) {
      prev.end = h.end
      prev.value = text.slice(prev.start, prev.end)
    } else joined.push({ ...h })
  }
  // "capital of France" is general knowledge; "I live in Berlin" is personal
  const personal = FIRST_PERSON.test(text) || joined.some((h) => h.kind === 'NAME')
  return joined.filter((h) => personal || !CONTEXT_KINDS.has(h.kind))
}

/** Pattern hits and AI hits together, without overlaps (pattern hits win ties). */
export function mergeHits(a: ShieldHit[], b: ShieldHit[]): ShieldHit[] {
  const all = [...a, ...b].sort((x, y) => x.start - y.start || y.end - y.start - (x.end - x.start))
  const out: ShieldHit[] = []
  for (const h of all) if (!out.length || h.start >= out[out.length - 1].end) out.push(h)
  return out
}

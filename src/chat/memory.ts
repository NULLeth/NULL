import { useCallback, useEffect, useState } from 'react'
import { IS_LIVE } from '../config/mode'
import { randId } from '../lib/random'
import { normalize, wordPiece, words } from './aiShield'
import { cachedBytes, loadOrt, type Ort } from './ort'

/**
 * Private Memory: notes NULL may use in your chats, kept in this browser only.
 *
 * Before a question is sent, a small sentence model (gte-small, 34 MB, WebAssembly) compares
 * it with your notes here and picks the few that fit. Only those go along with that
 * one request, through Prompt Shield like the rest of the message; the other notes never leave
 * the browser. Web search, research and image mode don't use memory, so a note never ends up
 * in a search query.
 *
 * How well a note fits is measured against the note's own baseline: its average similarity to
 * a set of everyday questions that have nothing to do with you. A note like "I prefer short
 * answers" is a little similar to everything; it only counts when a message stands out from that.
 *
 * The model and its vocabulary (public/models/gte-small) are served from this site.
 */

const MODEL_URL = '/models/gte-small/model_quantized.onnx'
const VOCAB_URL = '/models/gte-small/vocab.txt'
const CACHE = 'null-memory-v1'
export const MEMORY_MODEL_MB = 34
/** at most this many notes go along with one message */
export const MAX_RECALL = 3
/** a note must stand out this far (standard deviations) from its baseline to fit */
const MIN_FIT = 1
/** …and be no further than this behind the best fitting note */
const MAX_BEHIND = 3
/** everyday questions that say nothing about the user: each note's baseline */
const NEUTRAL = [
  'What is the capital of France?',
  'Explain quantum computing simply.',
  'Write a poem about the sea.',
  'How do I fix a flat tire?',
  'Summarize the history of Rome.',
  'What is a good name for a startup?',
  'How does a vaccine work?',
  'Translate hello into Japanese.',
  'What are black holes?',
  'Give me tips for public speaking.',
  'How do I make a budget?',
  'What is machine learning?',
  'Recommend a good book.',
  'How do I clean a coffee machine?',
  'What is the speed of light?',
  'Explain how elections work.',
  'How do I learn to code?',
  'What is inflation?',
  'Tell me a joke.',
  'How do airplanes fly?',
]
const MAX_NOTES = 200
export const MAX_NOTE_CHARS = 400
/** the model reads at most this many word pieces of a text */
const MAX_PIECES = 256

const KEY = IS_LIVE ? 'null.memory.v1' : 'null.memory.demo.v1'

export interface MemoryNote {
  id: string
  text: string
  ts: number
}

export interface Recalled {
  note: MemoryNote
  /** how far the note stands out for this message, in standard deviations above its baseline */
  fit: number
}

/** 1 = fits, 2 = fits well, 3 = fits strongly */
export const fitLevel = (fit: number) => (fit >= 3 ? 3 : fit >= 2 ? 2 : 1)

interface Model {
  ort: Ort
  session: import('onnxruntime-web/wasm').InferenceSession
  vocab: Map<string, number>
}

let model: Promise<Model> | null = null

/** Loads the runtime and the model once; later calls reuse it. */
export function loadMemoryModel(onProgress?: (p: number) => void): Promise<Model> {
  model ??= (async () => {
    const ort = await loadOrt()
    const [bytes, vocabText] = await Promise.all([cachedBytes(CACHE, MODEL_URL, onProgress), fetch(VOCAB_URL).then((r) => r.text())])
    const session = await ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ['wasm'], logSeverityLevel: 3 })
    const vocab = new Map(vocabText.split(/\r?\n/).map((t, i) => [t, i] as [string, number]))
    return { ort, session, vocab }
  })().catch((e) => {
    model = null
    throw e
  })
  return model
}

/** text → unit vector, kept for this tab */
const vectors = new Map<string, Float32Array>()

/** The meaning of a text as a 384-number unit vector (mean of the model's token states). */
export async function embed(text: string): Promise<Float32Array> {
  const have = vectors.get(text)
  if (have) return have
  const m = await loadMemoryModel()
  const cls = m.vocab.get('[CLS]') ?? 101
  const sep = m.vocab.get('[SEP]') ?? 102
  const ids = [cls]
  for (const w of words(text)) {
    ids.push(...wordPiece(normalize(w.text), m.vocab))
    if (ids.length >= MAX_PIECES - 1) break
  }
  ids.length = Math.min(ids.length, MAX_PIECES - 1)
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
  const states = out.last_hidden_state ?? out[m.session.outputNames[0]]
  const data = states.data as Float32Array
  const dim = states.dims[2]
  const v = new Float32Array(dim)
  for (let i = 0; i < n; i++) for (let d = 0; d < dim; d++) v[d] += data[i * dim + d]
  let norm = 0
  for (let d = 0; d < dim; d++) norm += v[d] * v[d]
  norm = Math.sqrt(norm) || 1
  for (let d = 0; d < dim; d++) v[d] /= norm
  vectors.set(text, v)
  return v
}

const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** note text → its similarity to the neutral questions (mean, spread) */
const baselines = new Map<string, { mean: number; sd: number }>()

async function baseline(text: string): Promise<{ mean: number; sd: number }> {
  const have = baselines.get(text)
  if (have) return have
  const v = await embed(text)
  const sims: number[] = []
  for (const q of NEUTRAL) sims.push(dot(v, await embed(q)))
  const mean = sims.reduce((a, b) => a + b, 0) / sims.length
  const sd = Math.sqrt(sims.reduce((a, b) => a + (b - mean) ** 2, 0) / sims.length) || 0.01
  const b = { mean, sd }
  baselines.set(text, b)
  return b
}

/** The notes that fit a message best, best first (at most MAX_RECALL). */
export async function recall(message: string, notes: MemoryNote[]): Promise<Recalled[]> {
  if (!message.trim() || !notes.length) return []
  const q = await embed(message)
  const scored: Recalled[] = []
  for (const note of notes) {
    const b = await baseline(note.text)
    scored.push({ note, fit: (dot(q, await embed(note.text)) - b.mean) / b.sd })
  }
  scored.sort((a, b) => b.fit - a.fit)
  const best = scored[0]?.fit ?? 0
  return scored.filter((r) => r.fit >= MIN_FIT && r.fit >= best - MAX_BEHIND).slice(0, MAX_RECALL)
}

/** How the picked notes reach the model: a block in front of the message, like a document. */
export const memoryBlock = (notes: string[]) =>
  `<memory>\nNotes the user saved in NULL. Use them only where they help with this message.\n${notes.map((n) => `- ${n.replace(/\s+/g, ' ').trim()}`).join('\n')}\n</memory>`

interface Stored {
  on: boolean
  notes: MemoryNote[]
}

function load(): Stored {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Stored> | null
    if (j && Array.isArray(j.notes))
      return {
        on: j.on !== false,
        notes: j.notes.filter((n): n is MemoryNote => !!n && typeof n.id === 'string' && typeof n.text === 'string' && typeof n.ts === 'number'),
      }
  } catch {
    /* fall through */
  }
  return { on: true, notes: [] }
}

/** The notes and the on/off switch, saved in this browser (demo notes are kept apart). */
export function useMemory() {
  const [state, setState] = useState<Stored>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage full or blocked: notes stay for this tab */
    }
  }, [state])

  const add = useCallback((text: string) => {
    const t = text.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_CHARS)
    if (!t) return
    setState((s) => (s.notes.some((n) => n.text === t) ? s : { ...s, notes: [{ id: randId('mem', 10), text: t, ts: Date.now() }, ...s.notes].slice(0, MAX_NOTES) }))
  }, [])

  const remove = useCallback((id: string) => setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })), [])
  const clear = useCallback(() => setState((s) => ({ ...s, notes: [] })), [])
  const setOn = useCallback((on: boolean) => setState((s) => ({ ...s, on })), [])

  /** Adds notes from a backup that aren't here yet; returns how many were new. */
  const merge = useCallback(
    (incoming: MemoryNote[]) => {
      const have = new Set(state.notes.map((n) => n.id))
      const texts = new Set(state.notes.map((n) => n.text))
      const fresh = incoming.filter((n) => !have.has(n.id) && !texts.has(n.text))
      if (fresh.length) setState((s) => ({ ...s, notes: [...s.notes, ...fresh].sort((a, b) => b.ts - a.ts).slice(0, MAX_NOTES) }))
      return fresh.length
    },
    [state.notes],
  )

  return { on: state.on, notes: state.notes, add, remove, clear, setOn, merge }
}

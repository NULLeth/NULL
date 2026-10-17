import { useEffect, useState } from 'react'

/**
 * Outbox: what this page sent, as it happened. Every request made with fetch in this tab is
 * listed with where it went, how big it was and, for text bodies, exactly what was in it, so
 * anyone can check that an answer request carried placeholders instead of names. Keys in
 * headers are masked. Files the page loaded (scripts, fonts, models) are counted by host.
 *
 * The log lives in memory only: nothing is saved, a reload clears it, and leaving a ghost chat
 * clears it too. Not covered: what the browser or extensions do on their own, and downloads made
 * inside web workers (the OCR model).
 */

export interface OutboxEntry {
  id: number
  ts: number
  method: string
  host: string
  path: string
  /** what the request was for, in plain words */
  what: string
  /** request body size in bytes (0 when there is none or it can't be read) */
  bytes: number
  /** the body as readable text (JSON pretty-printed, images and long blobs shortened) */
  body?: string
  /** header names, with key/auth values masked */
  headers: string[]
  /** placeholders like [NAME_1] in the user's and the model's messages (not the instructions) */
  tags?: string[]
  status?: number
  ms?: number
  failed?: boolean
  /** demo mode: shown for illustration, nothing was sent */
  demo?: boolean
}

export interface PageFiles {
  host: string
  count: number
  bytes: number
}

const MAX = 300
let nextId = 1
let entries: OutboxEntry[] = []
const files = new Map<string, PageFiles>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const SECRET_HEADERS = /^(authorization|proxy-authorization|x-api-key|api-key|cookie)$/i
/** long tokens in a path (keys, ids) are masked in the list */
const maskPath = (p: string) => p.replace(/[A-Za-z0-9_-]{28,}/g, '•••')

/** A label for where a request went. */
function label(host: string, path: string, body: unknown): string {
  const model = body && typeof body === 'object' && 'model' in body ? String((body as { model: unknown }).model) : ''
  if (path.endsWith('/chat/completions')) return `answer request${model ? ` · ${model}` : ''}`
  if (path.endsWith('/images')) return `image request${model ? ` · ${model}` : ''}`
  if (path.startsWith('/api/connection')) return 'Tor check (NULL’s own server)'
  if (path.startsWith('/models/')) return 'AI model file, runs in your browser'
  if (path.startsWith('/zkapi') || host.includes('openanonymity') || path.includes('zkapi')) return 'zkAPI: proof, key or config'
  if (host.includes('blockscout')) return 'public vault stats (Blockscout)'
  if (host.includes('rpc') || host.includes('publicnode') || host.includes('alchemy')) return 'Ethereum RPC'
  if (path.startsWith('/ocr/')) return 'OCR files, run in your browser'
  return 'request'
}

const TAG = /\[[A-Z]+_\d+\]/g

/** Placeholders in a chat body's messages, skipping the system instructions (they name examples). */
function tagsOf(body: unknown): string[] | undefined {
  const messages = body && typeof body === 'object' && 'messages' in body ? (body as { messages: unknown }).messages : null
  if (!Array.isArray(messages)) return undefined
  const found = new Set<string>()
  for (const m of messages as { role?: string; content?: unknown }[]) {
    if (m.role === 'system') continue
    const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((p: { text?: string }) => p.text ?? '').join(' ') : ''
    for (const t of text.match(TAG) ?? []) found.add(t)
  }
  return [...found]
}

/** Shortens what nobody needs to read in full: images, proofs, long blobs. */
function readable(value: unknown): string {
  return JSON.stringify(
    value,
    (_k, v) => {
      if (typeof v !== 'string') return v
      if (v.startsWith('data:')) return `[${v.slice(5, v.indexOf(';')) || 'file'}, ${Math.round((v.length * 0.75) / 1024)} KB, sent as data]`
      if (v.length > 400 && !/\s/.test(v.slice(0, 200))) return `${v.slice(0, 48)}… (${(v.length / 1024).toFixed(1)} KB)`
      return v.length > 20_000 ? `${v.slice(0, 20_000)}… (cut here, ${(v.length / 1024).toFixed(0)} KB in total)` : v
    },
    2,
  )
}

function headerList(h: HeadersInit | undefined): string[] {
  if (!h) return []
  const pairs: [string, string][] = h instanceof Headers ? [...h.entries()] : Array.isArray(h) ? (h as [string, string][]) : Object.entries(h)
  return pairs.map(([k, v]) => (SECRET_HEADERS.test(k) ? `${k}: ${/^bearer\s/i.test(v) ? 'Bearer ' : ''}•••• (masked)` : `${k}: ${v.length > 80 ? `${v.slice(0, 80)}…` : v}`))
}

function push(e: Omit<OutboxEntry, 'id' | 'ts'>): number {
  const id = nextId++
  entries = [{ ...e, id, ts: Date.now() }, ...entries].slice(0, MAX)
  emit()
  return id
}

function patch(id: number, fields: Partial<OutboxEntry>) {
  entries = entries.map((e) => (e.id === id ? { ...e, ...fields } : e))
  emit()
}

/** What a request carries, read without touching streams. */
function describe(input: RequestInfo | URL, init?: RequestInit): Omit<OutboxEntry, 'id' | 'ts'> {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const raw = init?.body
  let body: string | undefined
  let parsed: unknown
  let bytes = 0
  if (typeof raw === 'string') {
    bytes = new TextEncoder().encode(raw).length
    try {
      parsed = JSON.parse(raw)
      body = readable(parsed)
    } catch {
      body = raw.length > 4000 ? `${raw.slice(0, 4000)}…` : raw
    }
  } else if (raw instanceof Blob) bytes = raw.size
  else if (raw instanceof ArrayBuffer) bytes = raw.byteLength
  else if (ArrayBuffer.isView(raw)) bytes = raw.byteLength
  const host = url.host
  const path = url.pathname
  return {
    tags: tagsOf(parsed),
    method,
    host,
    path: maskPath(path) + (url.search ? '?…' : ''),
    what: label(host, path, parsed),
    bytes,
    body,
    headers: headerList(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
  }
}

let installed = false

/** Starts listing this page's requests. Called once, before anything else on the chat page runs. */
export function installOutbox() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const real = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let id = 0
    try {
      id = push(describe(input, init))
    } catch {
      /* never let the log get in the way of a request */
    }
    const t0 = performance.now()
    try {
      const res = await real(input, init)
      if (id) patch(id, { status: res.status, ms: performance.now() - t0 })
      return res
    } catch (e) {
      if (id) patch(id, { failed: true, ms: performance.now() - t0 })
      throw e
    }
  }
  // files the page loaded (scripts, styles, fonts, images); fetches are listed above
  try {
    const seen = (list: PerformanceEntryList) => {
      for (const r of list as PerformanceResourceTiming[]) {
        if (r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest') continue
        let host: string
        try {
          host = new URL(r.name).host
        } catch {
          continue
        }
        const f = files.get(host) ?? { host, count: 0, bytes: 0 }
        f.count++
        f.bytes += r.transferSize || r.encodedBodySize || 0
        files.set(host, f)
      }
      emit()
    }
    seen(performance.getEntriesByType('resource'))
    new PerformanceObserver((l) => seen(l.getEntries())).observe({ type: 'resource' })
  } catch {
    /* no resource timing: the request list still works */
  }
}

/** Demo mode: shows the request a live answer would send, marked as not sent. */
export function recordDemo(host: string, path: string, body: unknown) {
  push({ method: 'POST', host, path, tags: tagsOf(body), what: `${label(host, path, body)} · DEMO, not sent`, bytes: new TextEncoder().encode(JSON.stringify(body)).length, body: readable(body), headers: ['authorization: Bearer •••• (masked)', 'content-type: application/json'], demo: true })
}

/** Empties the log (leaving a ghost chat does this too). */
export function clearOutbox() {
  entries = []
  emit()
}

export function useOutbox(): { entries: OutboxEntry[]; files: PageFiles[] } {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return { entries, files: [...files.values()].sort((a, b) => b.count - a.count) }
}


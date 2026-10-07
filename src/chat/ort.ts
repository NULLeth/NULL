/**
 * onnxruntime-web (WebAssembly) for the models that run in the browser: AI Shield and
 * Private Voice. The runtime is bundled by Vite and the models are served from this site,
 * so nothing is fetched from a third party.
 */

export type Ort = typeof import('onnxruntime-web/wasm')

let ort: Promise<Ort> | null = null

/** Loads the runtime once (single-threaded, works without cross-origin isolation). */
export function loadOrt(): Promise<Ort> {
  ort ??= (async () => {
    const [mod, { default: mjs }, { default: wasm }] = await Promise.all([
      import('onnxruntime-web/wasm') as Promise<Ort>,
      import('onnxruntime-web/ort-wasm-simd-threaded.mjs?url'),
      import('onnxruntime-web/ort-wasm-simd-threaded.wasm?url'),
    ])
    mod.env.wasm.wasmPaths = { mjs, wasm }
    mod.env.wasm.numThreads = 1
    return mod
  })().catch((e) => {
    ort = null
    throw e
  })
  return ort
}

/** Fetches with the Cache API so a model downloads once, reporting progress 0..1. */
export async function cachedBytes(cacheName: string, url: string, onProgress?: (p: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try {
    cache = await caches.open(cacheName)
    const hit = await cache.match(url)
    if (hit) {
      onProgress?.(1)
      return hit.arrayBuffer()
    }
  } catch {
    /* no Cache API (private mode): plain fetch */
  }
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Could not load ${url} (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let got = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    parts.push(value)
    got += value.length
    if (total) onProgress?.(Math.min(0.99, got / total))
  }
  const bytes = new Uint8Array(got)
  let at = 0
  for (const p of parts) {
    bytes.set(p, at)
    at += p.length
  }
  try {
    await cache?.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }))
  } catch {
    /* cache full: fine, it just downloads again next time */
  }
  onProgress?.(1)
  return bytes.buffer
}

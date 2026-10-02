const HEX = '0123456789abcdef'

export function randHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  let out = '0x'
  for (const b of buf) out += HEX[b >> 4] + HEX[b & 15]
  return out
}

export function randId(prefix: string, len = 10): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  let s = ''
  for (const b of buf) s += alphabet[b % alphabet.length]
  return `${prefix}_${s}`
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Small deterministic PRNG (mulberry32) for seeded visuals. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

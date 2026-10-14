import type { Source } from '../live/stream'

/**
 * Private share links: a question and its answer packed into the link itself, after the "#".
 * Browsers never send that part of a URL to a server, so nullzk.com never receives what is
 * shared; the /s page unpacks it in the reader's browser.
 *
 *   https://nullzk.com/s#1.p.<base64url(deflate(json))>                    anyone with the link
 *   https://nullzk.com/s#1.e.<base64url(salt · iv · AES-GCM(deflate(json)))>  link + passphrase
 *
 * With a passphrase the key comes from Argon2id (32 MiB, 2 passes), lighter than a backup's
 * because the reader may be on a phone.
 */

export interface SharedChat {
  v: 1
  q: string
  a: string
  model: string
  ts: number
  sources?: Source[]
  /** names and details were left as placeholders */
  shielded?: boolean
}

const KDF = { m: 32 * 1024, t: 2, p: 1 }
const AAD = new TextEncoder().encode('NULLSHARE1')
/** past this a link may be cut by some apps */
export const LONG_LINK = 16_000

export class NeedsPassphrase extends Error {}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer())
}

async function key(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const { argon2id } = await import('hash-wasm')
  const raw = await argon2id({ password: passphrase.normalize('NFKC'), salt, parallelism: KDF.p, iterations: KDF.t, memorySize: KDF.m, hashLength: 32, outputType: 'binary' })
  return crypto.subtle.importKey('raw', new Uint8Array(raw), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** The "#…" part of a share link. */
export async function makeShareHash(item: SharedChat, passphrase?: string): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(item)), new CompressionStream('deflate-raw'))
  if (!passphrase) return `#1.p.${b64url(packed)}`
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, await key(passphrase, salt), packed))
  const out = new Uint8Array(salt.length + iv.length + cipher.length)
  out.set(salt, 0)
  out.set(iv, 16)
  out.set(cipher, 28)
  return `#1.e.${b64url(out)}`
}

/** Whether a link's hash needs a passphrase. */
export const isLocked = (hash: string) => hash.replace(/^#/, '').startsWith('1.e.')

/** Unpacks a share link's hash. Throws NeedsPassphrase when it is locked and none was given. */
export async function readShareHash(hash: string, passphrase?: string): Promise<SharedChat> {
  const h = hash.replace(/^#/, '')
  const [v, kind, body] = [h.slice(0, 1), h.slice(2, 3), h.slice(4)]
  if (v !== '1' || !body || (kind !== 'p' && kind !== 'e')) throw new Error('This link is broken or incomplete.')
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = unb64url(body)
  } catch {
    throw new Error('This link is broken or incomplete.')
  }
  if (kind === 'e') {
    if (!passphrase) throw new NeedsPassphrase('This answer is locked with a passphrase.')
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(16, 28), additionalData: AAD }, await key(passphrase, bytes.slice(0, 16)), bytes.subarray(28))
      bytes = new Uint8Array(plain)
    } catch {
      throw new Error('Wrong passphrase, or the link was changed.')
    }
  }
  try {
    const item = JSON.parse(new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')))) as SharedChat
    if (item.v !== 1 || typeof item.a !== 'string') throw new Error()
    return item
  } catch {
    throw new Error('This link is broken or incomplete.')
  }
}

import { getImageBlob } from './images'
import type { Conversation } from './store'

/**
 * Encrypted backup: every chat in this browser, its attachments and generated images, and the
 * shield's word list, packed into one file and encrypted here, before it is saved anywhere.
 *
 *   file    = "NULLBAK1" · u32 header length · header (JSON) · ciphertext
 *   key     = Argon2id(passphrase, salt; 64 MiB, 3 passes) → 256-bit AES key
 *   cipher  = AES-256-GCM(gzip(payload)), with the magic + header as additional data,
 *             so a changed header fails to decrypt just like a wrong passphrase
 *   payload = u32 manifest length · manifest (JSON: chats, settings, file list) · file bytes
 *
 * NULL never sees the file or the passphrase. Without the passphrase the file can't be opened.
 * The private balance is not included: its note stays bound to the browser that made it.
 */

const MAGIC = 'NULLBAK1'
const KDF = { m: 64 * 1024, t: 3, p: 1 }
export const BACKUP_EXT = '.nullbak'
export const MIN_PASSPHRASE = 12

interface Header {
  v: 1
  kdf: 'argon2id'
  m: number
  t: number
  p: number
  salt: string
  iv: string
}

interface Manifest {
  v: 1
  created: number
  mode: 'live' | 'demo'
  conversations: Conversation[]
  shieldWords: string[]
  files: { id: string; type: string; size: number }[]
}

export interface BackupContents {
  created: number
  mode: 'live' | 'demo'
  conversations: Conversation[]
  shieldWords: string[]
  files: Map<string, Blob>
}

const enc = new TextEncoder()
const dec = new TextDecoder()
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const u32 = (n: number) => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}
const readU32 = (b: Uint8Array, at: number) => new DataView(b.buffer, b.byteOffset + at, 4).getUint32(0, true)

async function pipe(data: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer())
}

async function deriveKey(passphrase: string, salt: Uint8Array, h: { m: number; t: number; p: number }): Promise<CryptoKey> {
  const { argon2id } = await import('hash-wasm')
  const raw = await argon2id({
    password: passphrase.normalize('NFKC'),
    salt,
    parallelism: h.p,
    iterations: h.t,
    memorySize: h.m,
    hashLength: 32,
    outputType: 'binary',
  })
  return crypto.subtle.importKey('raw', new Uint8Array(raw), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** The ids of everything a set of chats keeps in IndexedDB (documents also have a `.wire` copy). */
export function storedIds(conversations: Conversation[]): string[] {
  const ids: string[] = []
  for (const c of conversations)
    for (const m of c.messages) {
      for (const i of m.images ?? []) ids.push(i.id)
      for (const f of m.files ?? []) {
        ids.push(f.id)
        if (f.kind === 'doc') ids.push(`${f.id}.wire`)
      }
    }
  return ids
}

/** 100 random bits as four groups of five (Crockford base32: no I, L, O, U). */
export function generatePassphrase(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const chars = [...bytes].map((b) => alphabet[b & 31])
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join('')).join('-')
}

/** Packs and encrypts the chats. */
export async function makeBackup(
  input: { conversations: Conversation[]; mode: 'live' | 'demo'; shieldWords: string[] },
  passphrase: string,
  onPhase: (p: string) => void = () => {},
): Promise<{ blob: Blob; files: number }> {
  onPhase('Collecting chats and files…')
  const blobs: { id: string; blob: Blob }[] = []
  for (const id of storedIds(input.conversations)) {
    const blob = await getImageBlob(id)
    if (blob) blobs.push({ id, blob })
  }
  const manifest: Manifest = {
    v: 1,
    created: Date.now(),
    mode: input.mode,
    conversations: input.conversations,
    shieldWords: input.shieldWords,
    files: blobs.map(({ id, blob }) => ({ id, type: blob.type, size: blob.size })),
  }
  const mBytes = enc.encode(JSON.stringify(manifest))
  const payload = new Uint8Array(await new Blob([u32(mBytes.length), mBytes, ...blobs.map((b) => b.blob)]).arrayBuffer())
  onPhase('Compressing…')
  const packed = await pipe(payload, new CompressionStream('gzip'))
  onPhase('Making the key from your passphrase (Argon2id)…')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const header: Header = { v: 1, kdf: 'argon2id', ...KDF, salt: b64(salt), iv: b64(iv) }
  const hBytes = enc.encode(JSON.stringify(header))
  const key = await deriveKey(passphrase, salt, KDF)
  onPhase('Encrypting…')
  const head = new Uint8Array(await new Blob([enc.encode(MAGIC), u32(hBytes.length), hBytes]).arrayBuffer())
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: head }, key, packed)
  return { blob: new Blob([head, cipher], { type: 'application/octet-stream' }), files: blobs.length }
}

/** Decrypts and unpacks a backup file. */
export async function openBackup(file: Blob, passphrase: string, onPhase: (p: string) => void = () => {}): Promise<BackupContents> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < 12 || dec.decode(bytes.subarray(0, 8)) !== MAGIC) throw new Error('This is not a NULL backup file.')
  const hLen = readU32(bytes, 8)
  let header: Header
  try {
    header = JSON.parse(dec.decode(bytes.subarray(12, 12 + hLen))) as Header
  } catch {
    throw new Error('This backup file is damaged.')
  }
  if (typeof header.v === 'number' && header.v > 1) throw new Error('This backup was made by a newer version of NULL.')
  if (header.v !== 1 || header.kdf !== 'argon2id' || !header.salt || !header.iv) throw new Error('This backup file is damaged.')
  // don't let a crafted file ask for absurd amounts of memory or time
  if (header.m > 1024 * 1024 || header.t > 20 || header.p > 8) throw new Error('This backup file is damaged.')
  onPhase('Making the key from your passphrase (Argon2id)…')
  const key = await deriveKey(passphrase, unb64(header.salt), header)
  onPhase('Decrypting…')
  let packed: ArrayBuffer
  try {
    packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(header.iv), additionalData: bytes.subarray(0, 12 + hLen) }, key, bytes.subarray(12 + hLen))
  } catch {
    throw new Error('Wrong passphrase, or the file was changed or damaged.')
  }
  onPhase('Unpacking…')
  const payload = await pipe(new Uint8Array(packed), new DecompressionStream('gzip'))
  const mLen = readU32(payload, 0)
  const manifest = JSON.parse(dec.decode(payload.subarray(4, 4 + mLen))) as Manifest
  const files = new Map<string, Blob>()
  let at = 4 + mLen
  for (const f of manifest.files) {
    files.set(f.id, new Blob([payload.slice(at, at + f.size)], { type: f.type }))
    at += f.size
  }
  return { created: manifest.created, mode: manifest.mode, conversations: manifest.conversations ?? [], shieldWords: manifest.shieldWords ?? [], files }
}

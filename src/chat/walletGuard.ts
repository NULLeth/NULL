import WORDLIST from './bip39-english.txt?raw'
import type { ShieldHit } from './shield'

/**
 * Wallet Guard: seed phrases and private keys never leave the browser. Always on, also with
 * Prompt Shield switched off. What it finds is swapped for [SEED_1] / [KEY_1] like any shielded
 * detail, in messages, documents and (via OCR) screenshots.
 *
 * Seed phrases: twelve or more words in a row from the BIP-39 English list (bip39-english.txt,
 * the official list, sha256 2f5eed53…dbda), separated only by spaces, commas or numbering, so
 * "1. abandon 2. ability…" and one word per line count too. Normal English almost never has
 * twelve list words in a row: "the", "a", "is", "of", "to", "in", "I" aren't on it.
 * Whether the words also carry a valid BIP-39 checksum is checked separately (async, WebCrypto).
 *
 * Private keys: 64 hex characters (Ethereum-style), 86–90 base58 characters (a Solana secret
 * key), a 64-number byte array (a Solana keypair file), WIF (Bitcoin) and xprv/yprv/zprv/tprv.
 * Transaction ids and hashes can look the same, so a "tx", "hash", "signature" or "sha256" just
 * before the value lets it through.
 */

const WORDS = WORDLIST.split(/\r?\n/).filter(Boolean)
const INDEX = new Map(WORDS.map((w, i) => [w, i]))
const STANDARD = new Set([12, 15, 18, 21, 24])
/** what may sit between two words of a phrase: spaces, line breaks, commas, "2.", "(3)", "#4" */
const GAP = /^[\s,;:.·•|/\-–()[\]#\d]*$/
/** words a transaction id or a hash is usually introduced with */
const NOT_A_KEY = /(tx|txid|txn|transaction|hash|sha-?256|sha|checksum|digest|signature|sig|block|commit|solscan|etherscan|mempool|explorer)\b[^\n]{0,24}$/i
const SAYS_KEY = /(private|priv|secret|signing)\s*key|\bpk\b|\bkey\b/i
const B58 = '1-9A-HJ-NP-Za-km-z'

export interface SeedRun {
  start: number
  end: number
  words: string[]
}

/** Runs of twelve or more BIP-39 words in a row. */
export function findSeeds(text: string): SeedRun[] {
  const out: SeedRun[] = []
  let run: { start: number; end: number; words: string[] } | null = null
  const close = () => {
    if (run && run.words.length >= 12) out.push(run)
    run = null
  }
  for (const m of text.matchAll(/[A-Za-z]+/g)) {
    const word = m[0].toLowerCase()
    const start = m.index
    const end = start + m[0].length
    if (!INDEX.has(word)) {
      close()
      continue
    }
    if (run && GAP.test(text.slice(run.end, start)) && start - run.end <= 12) {
      run.words.push(word)
      run.end = end
    } else {
      close()
      run = { start, end, words: [word] }
    }
  }
  close()
  return out
}

/** Whether a phrase carries a valid BIP-39 checksum: then it is a real wallet seed, not chance. */
export async function seedChecksumOk(words: string[]): Promise<boolean> {
  if (!STANDARD.has(words.length) || words.some((w) => !INDEX.has(w))) return false
  const bits = words.map((w) => INDEX.get(w)!.toString(2).padStart(11, '0')).join('')
  const ent = (bits.length * 32) / 33
  const entropy = Uint8Array.from(bits.slice(0, ent).match(/.{8}/g)!, (b) => parseInt(b, 2))
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', entropy))
  const hashBits = [...hash].map((b) => b.toString(2).padStart(8, '0')).join('')
  return hashBits.slice(0, bits.length - ent) === bits.slice(ent)
}

interface KeyRule {
  re: RegExp
  /** what it is, for the guard bar */
  what: string
  ok?: (value: string, before: string) => boolean
}

const KEY_RULES: KeyRule[] = [
  // a Solana keypair file: 64 numbers, each a byte
  { re: /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/g, what: 'keypair file', ok: (v) => (v.match(/\d+/g) ?? []).every((n) => Number(n) <= 255) },
  { re: new RegExp(`\\b[xyzt]prv[${B58}]{100,108}\\b`, 'g'), what: 'extended private key' },
  // 64 hex characters: how wallets export an Ethereum private key (with 0x only when the text says "key")
  { re: /(?<![0-9a-fA-Fx])[0-9a-fA-F]{64}(?![0-9a-fA-F])/g, what: 'private key', ok: (_v, before) => !NOT_A_KEY.test(before) },
  { re: /\b0x[0-9a-fA-F]{64}\b/g, what: 'private key', ok: (_v, before) => SAYS_KEY.test(before) && !NOT_A_KEY.test(before) },
  // a Solana secret key, base58 (a transaction signature is just as long: "tx"/"signature" before it lets it through)
  { re: new RegExp(`(?<![${B58}])[${B58}]{86,90}(?![${B58}])`, 'g'), what: 'private key', ok: (_v, before) => !NOT_A_KEY.test(before) && !/\/$/.test(before) },
  // Bitcoin WIF
  { re: new RegExp(`(?<![${B58}])[5KL][${B58}]{50,51}(?![${B58}])`, 'g'), what: 'private key (WIF)', ok: (_v, before) => !NOT_A_KEY.test(before) },
]

export interface GuardHit extends ShieldHit {
  kind: 'SEED' | 'KEY'
  /** "seed phrase · 12 words", "private key" … */
  what: string
  /** the phrase's words, for the checksum check */
  words?: string[]
}

/** Seed phrases and private keys in `text`, never overlapping. */
export function findWallet(text: string): GuardHit[] {
  const hits: GuardHit[] = findSeeds(text).map((r) => ({
    kind: 'SEED',
    start: r.start,
    end: r.end,
    value: text.slice(r.start, r.end),
    what: `seed phrase · ${r.words.length} words`,
    words: r.words,
  }))
  for (const rule of KEY_RULES)
    for (const m of text.matchAll(rule.re)) {
      const start = m.index
      const end = start + m[0].length
      if (hits.some((h) => start < h.end && end > h.start)) continue
      if (rule.ok && !rule.ok(m[0], text.slice(Math.max(0, start - 40), start))) continue
      hits.push({ kind: 'KEY', start, end, value: m[0], what: rule.what })
    }
  return hits.sort((a, b) => a.start - b.start)
}

/** Drops hits that overlap a guard hit, so a seed phrase is never also listed as something else. */
export const outsideGuard = <T extends { start: number; end: number }>(hits: T[], guard: { start: number; end: number }[]) =>
  hits.filter((h) => !guard.some((g) => h.start < g.end && h.end > g.start))

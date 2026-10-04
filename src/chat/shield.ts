/**
 * Prompt Shield: finds personal details in a message and swaps them for
 * placeholders ([EMAIL_1], [NAME_1], …) before anything leaves the browser.
 * The model only ever sees the placeholders; its answer is filled back in here.
 *
 * Pattern-based on purpose: it runs instantly on any device and you can see
 * exactly what it hides. It does not change your writing style, and it can't
 * know every detail you describe in words, so the UI says so.
 */

export type ShieldKind =
  | 'EMAIL'
  | 'PHONE'
  | 'WALLET'
  | 'SECRET'
  | 'IBAN'
  | 'CARD'
  | 'IP'
  | 'ADDRESS'
  | 'DATE'
  | 'AGE'
  | 'NAME'
  | 'CUSTOM'

export interface ShieldHit {
  start: number
  end: number
  kind: ShieldKind
  value: string
}

/** value → placeholder, kept per conversation so the same detail always gets the same tag */
export type ShieldMap = Record<string, string>

export const KIND_LABEL: Record<ShieldKind, string> = {
  EMAIL: 'email',
  PHONE: 'phone',
  WALLET: 'wallet',
  SECRET: 'key / secret',
  IBAN: 'IBAN',
  CARD: 'card',
  IP: 'IP',
  ADDRESS: 'address',
  DATE: 'date',
  AGE: 'age',
  NAME: 'name',
  CUSTOM: 'custom',
}

const digits = (s: string) => s.replace(/\D/g, '').length

function luhn(num: string): boolean {
  const d = num.replace(/\D/g, '')
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

const NAME_WORD = "[A-ZÄÖÜ][a-zäöüßéèáàíóúñç'’-]+"
const NAMES = `${NAME_WORD}(?:\\s+${NAME_WORD}){0,2}`
const STREET_DE = '(?:straße|strasse|str\\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee)'
const STREET_EN = '(?:Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Lane|Ln\\.?|Drive|Dr\\.?|Boulevard|Blvd\\.?|Court|Ct\\.?|Way)'
const BIRTH_CONTEXT = /(born|birth|birthday|dob|geboren|geburtstag|geb\.)\W{0,20}$/i

interface Rule {
  kind: ShieldKind
  re: RegExp
  /** which capture group is the detail (default: whole match) */
  group?: number
  ok?: (value: string, text: string, index: number) => boolean
}

const RULES: Rule[] = [
  // secrets first: a 64-hex string may be a private key, never send it
  { kind: 'SECRET', re: /\b(?:sk|pk|rk)[-_](?:live|test|proj|or-v1)?[-_]?[A-Za-z0-9]{16,}\b/g },
  { kind: 'SECRET', re: /\b(?:ghp|gho|ghu|ghs|github_pat|xox[abpr]|AKIA)[A-Za-z0-9_]{16,}\b/g },
  { kind: 'SECRET', re: /\b0x[a-fA-F0-9]{64}\b/g },
  { kind: 'SECRET', re: /\b(?:[a-z]{3,8}\s){11}[a-z]{3,8}(?:\s[a-z]{3,8}){0,12}\b/g, ok: (v) => /^(\w+\s){11,23}\w+$/.test(v) && looksLikeSeed(v) },
  { kind: 'EMAIL', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: 'WALLET', re: /\b0x[a-fA-F0-9]{40}\b/g },
  { kind: 'WALLET', re: /\b(?:bc1[a-z0-9]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g, ok: (v) => v.startsWith('bc1') || /\d/.test(v) },
  {
    kind: 'WALLET',
    re: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    ok: (v) => /\d/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v),
  },
  { kind: 'WALLET', re: /\b[a-z0-9-]{3,}\.eth\b/gi },
  { kind: 'IBAN', re: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g },
  { kind: 'CARD', re: /\b(?:\d[ -]?){12,18}\d\b/g, ok: (v) => digits(v) >= 13 && digits(v) <= 19 && luhn(v) },
  { kind: 'IP', re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { kind: 'PHONE', re: /(?<![\w+])(?:\+|00)\d{1,3}[\s./-]?(?:\(?\d{1,5}\)?[\s./-]?){1,5}\d{2,6}(?!\w)/g, ok: (v) => digits(v) >= 8 },
  { kind: 'PHONE', re: /(?<![\w.,])0\d{2,5}[\s./-]?\d{2,}(?:[\s./-]?\d{2,})*(?![\w.,]\d)/g, ok: (v) => digits(v) >= 9 && digits(v) <= 14 },
  { kind: 'ADDRESS', re: new RegExp(`\\b[A-ZÄÖÜ][\\p{L}.-]*${STREET_DE}\\s+\\d{1,4}[a-z]?\\b`, 'gu') },
  { kind: 'ADDRESS', re: new RegExp(`\\b\\d{1,5}\\s+(?:[A-Z][a-z]+\\s){1,3}${STREET_EN}(?=\\W|$)`, 'g') },
  { kind: 'ADDRESS', re: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)?\b/g },
  {
    kind: 'DATE',
    re: /\b(?:\d{1,2}[./]\d{1,2}[./](?:19|20)\d{2}|(?:19|20)\d{2}-\d{2}-\d{2})\b/g,
    ok: (v, text, i) => {
      const year = Number(v.match(/(19|20)\d{2}/)?.[0])
      return BIRTH_CONTEXT.test(text.slice(Math.max(0, i - 30), i)) || year <= new Date().getFullYear() - 12
    },
  },
  { kind: 'AGE', re: /\b(?:I'?m|I am|aged?|ich bin)\s+(\d{1,2})(?:\s*(?:years?|y\/?o|jahre))?\b(?!\s*(?:%|€|\$|eur|usd|min|minutes?|hours?|days?|weeks?|months?|times?|x\b|km|kg|cm|m\b|tage?n?|wochen?|monate?n?|stunden?|mal\b|minuten?))/gi, group: 1 },
  { kind: 'AGE', re: /\b(\d{1,2})\s*(?:years? old|y\/o|jahre alt)\b/gi, group: 1 },
  {
    kind: 'NAME',
    re: new RegExp(`\\b(?:my name is|i am called|call me|ich heiße|ich heisse|mein name ist|name:)\\s+(${NAMES})`, 'gi'),
    group: 1,
  },
  { kind: 'NAME', re: new RegExp(`\\b(?:I'?m|this is|signed,?|regards,?|grüße,?|gruß,?)\\s+(${NAMES})\\b`, 'g'), group: 1 },
  {
    kind: 'NAME',
    re: new RegExp(
      `\\b(?:my|mein|meine|meinem|meiner|meinen)\\s+(?:landlord|boss|wife|husband|son|daughter|friend|doctor|lawyer|colleague|partner|vermieter|vermieterin|chef|chefin|frau|mann|sohn|tochter|freund|freundin|arzt|ärztin|anwalt|anwältin|kollege|kollegin)\\s+(${NAMES})`,
      'g',
    ),
    group: 1,
  },
]

const SEED_HINT = /^(abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis)$/

/** Twelve-plus lowercase words with no punctuation and few common words: probably a wallet seed phrase. */
function looksLikeSeed(v: string): boolean {
  const words = v.split(/\s+/)
  const common = /^(the|and|for|you|that|with|this|have|from|not|are|was|but|what|all|can|your|will|one|about|there|when|which|their|would|make|like|just|know|take|into|year|some|could|them|than|then|look|only|come|over|think|also|back|after|use|how|our|work|well|way|even|want|because|any|these|give|most|der|die|das|und|ist|ich|nicht|mit|sie|auf|für|ein|eine|wie|was|auch|bitte|kannst|mir)$/
  return words.filter((w) => common.test(w)).length <= 1 && words.some((w) => SEED_HINT.test(w) || w.length >= 4)
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** All personal details found in `text`, longest/earliest first, never overlapping. */
export function detect(text: string, custom: string[] = []): ShieldHit[] {
  const found: ShieldHit[] = []
  const add = (kind: ShieldKind, start: number, value: string) => {
    const v = value.trim()
    if (!v) return
    const s = start + value.indexOf(v)
    found.push({ kind, start: s, end: s + v.length, value: v })
  }
  for (const word of custom.map((w) => w.trim()).filter((w) => w.length >= 2)) {
    const re = new RegExp(`(?<![\\p{L}\\d])${escapeRe(word)}(?![\\p{L}\\d])`, 'giu')
    for (const m of text.matchAll(re)) add('CUSTOM', m.index ?? 0, m[0])
  }
  for (const rule of RULES) {
    rule.re.lastIndex = 0
    for (const m of text.matchAll(rule.re)) {
      const whole = m[0]
      const at = m.index ?? 0
      const value = rule.group ? m[rule.group] : whole
      if (!value) continue
      const start = rule.group ? at + whole.indexOf(value) : at
      if (rule.ok && !rule.ok(value, text, start)) continue
      add(rule.kind, start, value)
    }
  }
  // keep the first/longest hit where several overlap
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const out: ShieldHit[] = []
  for (const h of found) if (!out.length || h.start >= out[out.length - 1].end) out.push(h)
  return out
}

/** Replaces the hits (except `skip` values) with placeholders, reusing tags from `map`. */
export function shield(text: string, hits: ShieldHit[], map: ShieldMap, skip: Set<string> = new Set()): { text: string; map: ShieldMap; used: ShieldHit[] } {
  const next: ShieldMap = { ...map }
  const used: ShieldHit[] = []
  let out = ''
  let last = 0
  for (const h of hits) {
    if (skip.has(h.value)) continue
    let tag = next[h.value]
    if (!tag) {
      const n = Object.values(next).filter((t) => t.startsWith(`[${h.kind}_`)).length + 1
      tag = `[${h.kind}_${n}]`
      next[h.value] = tag
    }
    out += text.slice(last, h.start) + tag
    last = h.end
    used.push(h)
  }
  return { text: out + text.slice(last), map: next, used }
}

const TAG_RE = /\[?\b(EMAIL|PHONE|WALLET|SECRET|IBAN|CARD|IP|ADDRESS|DATE|AGE|NAME|CUSTOM)_(\d{1,3})\b\]?/gi

/** Puts the real details back into a model answer (only here, in the browser). */
export function restore(text: string, map: ShieldMap): string {
  const back: Record<string, string> = {}
  for (const [value, tag] of Object.entries(map)) back[tag.toUpperCase()] = value
  return text.replace(TAG_RE, (m, kind: string, n: string) => back[`[${kind.toUpperCase()}_${n}]`] ?? m)
}

export const SHIELD_SYSTEM =
  'Some personal details in the user’s messages were replaced with placeholders such as [NAME_1] or [EMAIL_1]. ' +
  'Treat them as the real values: keep each placeholder exactly as written whenever you refer to it, and never ask for or guess the real value.'

#!/usr/bin/env node
// NULL Agent Kit · https://nullzk.com/agents
//
// A local, OpenAI-compatible API for AI agents, in front of zkapi-clientd (the Ethereum
// Foundation / Open Anonymity client that pays every request from a private ETH balance
// with a zero-knowledge proof). On top of it, NULL adds:
//
//   · one key per agent (nk_…), each with its own daily budget in USD
//   · Prompt Shield: personal details are swapped for placeholders before a request leaves
//     this machine, and filled back into answers and tool calls on the way back
//   · a spend log without any content, and a small dashboard at http://127.0.0.1:8788
//
// One file, no dependencies, Node 18+. Listens on 127.0.0.1 only.
//
//   node null-agent.mjs init           first-time setup, creates your first agent key
//   node null-agent.mjs add <name>     new agent key  (--budget 2  --models claude,grok  --no-shield)
//   node null-agent.mjs agents         agents, budgets and spend
//   node null-agent.mjs remove <name>  revoke an agent key
//   node null-agent.mjs doctor         checks zkapi-clientd and the privacy settings
//   node null-agent.mjs serve          start the API on http://127.0.0.1:8788/v1

import { createHash, randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'

const VERSION = '0.1.0'

// ── Prompt Shield (generated from NULL Chat's src/chat/shield.ts at build time) ──
const KIND_LABEL = {
  EMAIL: "email",
  PHONE: "phone",
  WALLET: "wallet",
  SECRET: "key / secret",
  IBAN: "IBAN",
  CARD: "card",
  IP: "IP",
  ADDRESS: "address",
  DATE: "date",
  AGE: "age",
  NAME: "name",
  PLACE: "place",
  ORG: "organisation",
  ID: "ID number",
  CUSTOM: "custom"
};
const digits = (s) => s.replace(/\D/g, "").length;
function luhn(num) {
  const d = num.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
const NAME_WORD = "[A-Z\xC4\xD6\xDC][a-z\xE4\xF6\xFC\xDF\xE9\xE8\xE1\xE0\xED\xF3\xFA\xF1\xE7'\u2019-]+";
const NAMES = `${NAME_WORD}(?:\\s+${NAME_WORD}){0,2}`;
const STREET_DE = "(?:stra\xDFe|strasse|str\\.|weg|allee|platz|gasse|ring|damm|ufer|chaussee)";
const STREET_EN = "(?:Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Lane|Ln\\.?|Drive|Dr\\.?|Boulevard|Blvd\\.?|Court|Ct\\.?|Way)";
const BIRTH_CONTEXT = /(born|birth|birthday|dob|geboren|geburtstag|geb\.)\W{0,20}$/i;
const RULES = [
  // secrets first: a 64-hex string may be a private key, never send it
  { kind: "SECRET", re: /\b(?:sk|pk|rk)[-_](?:live|test|proj|or-v1)?[-_]?[A-Za-z0-9]{16,}\b/g },
  { kind: "SECRET", re: /\b(?:ghp|gho|ghu|ghs|github_pat|xox[abpr]|AKIA)[A-Za-z0-9_]{16,}\b/g },
  { kind: "SECRET", re: /\b0x[a-fA-F0-9]{64}\b/g },
  { kind: "SECRET", re: /\b(?:[a-z]{3,8}\s){11}[a-z]{3,8}(?:\s[a-z]{3,8}){0,12}\b/g, ok: (v) => /^(\w+\s){11,23}\w+$/.test(v) && looksLikeSeed(v) },
  { kind: "EMAIL", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: "WALLET", re: /\b0x[a-fA-F0-9]{40}\b/g },
  { kind: "WALLET", re: /\b(?:bc1[a-z0-9]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g, ok: (v) => v.startsWith("bc1") || /\d/.test(v) },
  {
    kind: "WALLET",
    re: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    ok: (v) => /\d/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v)
  },
  { kind: "WALLET", re: /\b[a-z0-9-]{3,}\.eth\b/gi },
  { kind: "IBAN", re: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g },
  { kind: "CARD", re: /\b(?:\d[ -]?){12,18}\d\b/g, ok: (v) => digits(v) >= 13 && digits(v) <= 19 && luhn(v) },
  { kind: "IP", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { kind: "PHONE", re: /(?<![\w+])(?:\+|00)\d{1,3}[\s./-]?(?:\(?\d{1,5}\)?[\s./-]?){1,5}\d{2,6}(?!\w)/g, ok: (v) => digits(v) >= 8 },
  { kind: "PHONE", re: /(?<![\w.,])0\d{2,5}[\s./-]?\d{2,}(?:[\s./-]?\d{2,})*(?![\w.,]\d)/g, ok: (v) => digits(v) >= 9 && digits(v) <= 14 },
  { kind: "ADDRESS", re: new RegExp(`\\b[A-Z\xC4\xD6\xDC][\\p{L}.-]*${STREET_DE}\\s+\\d{1,4}[a-z]?\\b`, "gu") },
  { kind: "ADDRESS", re: new RegExp(`\\b\\d{1,5}\\s+(?:[A-Z][a-z]+\\s){1,3}${STREET_EN}(?=\\W|$)`, "g") },
  { kind: "ADDRESS", re: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)?\b/g },
  {
    kind: "DATE",
    re: /\b(?:\d{1,2}[./]\d{1,2}[./](?:19|20)\d{2}|(?:19|20)\d{2}-\d{2}-\d{2})\b/g,
    ok: (v, text, i) => {
      const year = Number(v.match(/(19|20)\d{2}/)?.[0]);
      return BIRTH_CONTEXT.test(text.slice(Math.max(0, i - 30), i)) || year <= (/* @__PURE__ */ new Date()).getFullYear() - 12;
    }
  },
  { kind: "AGE", re: /\b(?:I'?m|I am|aged?|ich bin)\s+(\d{1,2})(?:\s*(?:years?|y\/?o|jahre))?\b(?!\s*(?:%|€|\$|eur|usd|min|minutes?|hours?|days?|weeks?|months?|times?|x\b|km|kg|cm|m\b|tage?n?|wochen?|monate?n?|stunden?|mal\b|minuten?))/gi, group: 1 },
  { kind: "AGE", re: /\b(\d{1,2})\s*(?:years? old|y\/o|jahre alt)\b/gi, group: 1 },
  {
    kind: "NAME",
    re: new RegExp(`\\b(?:my name is|i am called|call me|ich hei\xDFe|ich heisse|mein name ist|name:)\\s+(${NAMES})`, "gi"),
    group: 1
  },
  { kind: "NAME", re: new RegExp(`\\b(?:I'?m|this is|signed,?|regards,?|gr\xFC\xDFe,?|gru\xDF,?)\\s+(${NAMES})\\b`, "g"), group: 1 },
  {
    kind: "NAME",
    re: new RegExp(
      `\\b(?:my|mein|meine|meinem|meiner|meinen)\\s+(?:landlord|boss|wife|husband|son|daughter|friend|doctor|lawyer|colleague|partner|vermieter|vermieterin|chef|chefin|frau|mann|sohn|tochter|freund|freundin|arzt|\xE4rztin|anwalt|anw\xE4ltin|kollege|kollegin)\\s+(${NAMES})`,
      "g"
    ),
    group: 1
  }
];
const SEED_HINT = /^(abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis)$/;
function looksLikeSeed(v) {
  const words = v.split(/\s+/);
  const common = /^(the|and|for|you|that|with|this|have|from|not|are|was|but|what|all|can|your|will|one|about|there|when|which|their|would|make|like|just|know|take|into|year|some|could|them|than|then|look|only|come|over|think|also|back|after|use|how|our|work|well|way|even|want|because|any|these|give|most|der|die|das|und|ist|ich|nicht|mit|sie|auf|für|ein|eine|wie|was|auch|bitte|kannst|mir)$/;
  return words.filter((w) => common.test(w)).length <= 1 && words.some((w) => SEED_HINT.test(w) || w.length >= 4);
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\/*__SHIELD__*/");
}
function detect(text, custom = []) {
  const found = [];
  const add = (kind, start, value) => {
    const v = value.trim();
    if (!v) return;
    const s = start + value.indexOf(v);
    found.push({ kind, start: s, end: s + v.length, value: v });
  };
  for (const word of custom.map((w) => w.trim()).filter((w) => w.length >= 2)) {
    const re = new RegExp(`(?<![\\p{L}\\d])${escapeRe(word)}(?![\\p{L}\\d])`, "giu");
    for (const m of text.matchAll(re)) add("CUSTOM", m.index ?? 0, m[0]);
  }
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      const whole = m[0];
      const at = m.index ?? 0;
      const value = rule.group ? m[rule.group] : whole;
      if (!value) continue;
      const start = rule.group ? at + whole.indexOf(value) : at;
      if (rule.ok && !rule.ok(value, text, start)) continue;
      add(rule.kind, start, value);
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const out = [];
  for (const h of found) if (!out.length || h.start >= out[out.length - 1].end) out.push(h);
  return out;
}
function shield(text, hits, map, skip = /* @__PURE__ */ new Set()) {
  const next = { ...map };
  const used = [];
  let out = "";
  let last = 0;
  for (const h of hits) {
    if (skip.has(h.value)) continue;
    let tag = next[h.value];
    if (!tag) {
      const n = Object.values(next).filter((t) => t.startsWith(`[${h.kind}_`)).length + 1;
      tag = `[${h.kind}_${n}]`;
      next[h.value] = tag;
    }
    out += text.slice(last, h.start) + tag;
    last = h.end;
    used.push(h);
  }
  return { text: out + text.slice(last), map: next, used };
}
const TAG_RE = /\[?\b(EMAIL|PHONE|WALLET|SECRET|IBAN|CARD|IP|ADDRESS|DATE|AGE|NAME|PLACE|ORG|ID|CUSTOM)_(\d{1,3})\b\]?/gi;
function restore(text, map) {
  const back = {};
  for (const [value, tag] of Object.entries(map)) back[tag.toUpperCase()] = value;
  return text.replace(TAG_RE, (m, kind, n) => back[`[${kind.toUpperCase()}_${n}]`] ?? m);
}
const SHIELD_SYSTEM = "Some personal details in the user\u2019s messages were replaced with placeholders such as [NAME_1] or [EMAIL_1]. Treat them as the real values: keep each placeholder exactly as written whenever you refer to it, and never ask for or guess the real value.";

// ── config & state ──────────────────────────────────────────────────────────

const DIR = process.env.NULL_AGENT_DIR || join(homedir(), '.null-agent')
const CONFIG = join(DIR, 'config.json')
const STATE = join(DIR, 'state.json')
const USAGE = join(DIR, 'usage.jsonl')

/** Short names for the models NULL Chat offers; any full OpenRouter id works too. */
const ALIASES = {
  claude: 'anthropic/claude-sonnet-5.5',
  opus: 'anthropic/claude-opus-5.5',
  haiku: 'anthropic/claude-haiku-4.5',
  gpt: 'openai/gpt-6.1-sol',
  luna: 'openai/gpt-6-luna',
  gemini: 'google/gemini-3.8-flash',
  grok: 'x-ai/grok-4.7',
  deepseek: 'deepseek/deepseek-v4-pro-0813',
  kimi: 'moonshotai/kimi-k3',
  glm: 'z-ai/glm-5.3',
  mistral: 'mistralai/mistral-medium-3-5',
  llama: 'meta-llama/llama-4-maverick',
  auto: 'openrouter/auto',
}

const defaults = () => ({ version: VERSION, upstream: 'http://127.0.0.1:8787/v1', port: 8788, shieldWords: [], agents: [] })

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}
const loadConfig = () => ({ ...defaults(), ...readJson(CONFIG, {}) })
function saveConfig(c) {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(CONFIG, JSON.stringify(c, null, 2), { mode: 0o600 })
}

const today = () => new Date().toISOString().slice(0, 10)
function loadState() {
  const s = readJson(STATE, { day: today(), spent: {}, total: {}, requests: {}, last: {} })
  if (s.day !== today()) Object.assign(s, { day: today(), spent: {} })
  return s
}
let state = null
let saveTimer = null
function saveState() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => writeFileSync(STATE, JSON.stringify(state, null, 2)), 300)
}

const hashKey = (k) => createHash('sha256').update(k).digest('hex')
const newKey = () => `nk_${randomBytes(24).toString('base64url')}`
const usd = (v) => (v < 0.01 ? `${(v * 100).toFixed(3)}¢` : `$${v.toFixed(v < 1 ? 3 : 2)}`)

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function createAgent(cfg, name, opts = {}) {
  if (!/^[\w.-]{1,40}$/.test(name)) throw new Error('Agent names use letters, digits, ".", "-" and "_" (max 40).')
  if (cfg.agents.some((a) => a.name === name)) throw new Error(`An agent called "${name}" already exists.`)
  const key = newKey()
  cfg.agents.push({
    name,
    keyHash: hashKey(key),
    budgetUsd: Number(opts.budget ?? 1),
    models: opts.models ? String(opts.models).split(',').map((m) => m.trim()).filter(Boolean) : [],
    shield: opts.shield !== false,
    createdAt: new Date().toISOString(),
  })
  saveConfig(cfg)
  return key
}

function printKey(name, key, cfg) {
  console.log(`\n  agent   ${name}`)
  console.log(`  key     ${key}`)
  console.log(`  budget  $${cfg.agents.find((a) => a.name === name).budgetUsd} per day (UTC)\n`)
  console.log('  The key is shown once. NULL only stores its hash.')
  console.log(`  Base URL for your agent: http://127.0.0.1:${cfg.port}/v1\n`)
}

const CHECKLIST = `
  Before "serve", NULL needs zkapi-clientd running (macOS or Linux; Windows via WSL2):

    1  install    curl -fsSL https://github.com/ethereum/zkapi/releases/download/clientd-v0.1.6/install.sh | bash
    2  fund       zkapi-clientd config
    3  privacy    zkapi-clientd config --key-reuse-window-seconds 0     (a fresh key for every request)
       optional   zkapi-clientd config --relay-url socks5://127.0.0.1:9050   (route through Tor)
    4  run        zkapi-clientd serve          (leave it running)

  Then: node null-agent.mjs serve
`

async function doctor(cfg) {
  console.log(`\n  NULL Agent Kit ${VERSION} · config ${CONFIG}\n`)
  try {
    const res = await fetch(`${cfg.upstream}/models`, { signal: AbortSignal.timeout(8000) })
    const j = await res.json().catch(() => null)
    const n = Array.isArray(j?.data) ? j.data.length : 0
    console.log(res.ok ? `  ✓ zkapi-clientd answers at ${cfg.upstream} (${n} models)` : `  ✗ zkapi-clientd answered ${res.status}`)
  } catch {
    console.log(`  ✗ zkapi-clientd is not reachable at ${cfg.upstream}`)
    console.log(CHECKLIST)
  }
  console.log(`  ${cfg.agents.length ? '✓' : '✗'} ${cfg.agents.length} agent key(s)${cfg.agents.length ? '' : ' · create one: node null-agent.mjs add my-agent'}`)
  console.log('  · privacy: run "zkapi-clientd config --key-reuse-window-seconds 0" so requests never share a key')
  console.log('  · privacy: add "--relay-url socks5://127.0.0.1:9050" with Tor running to hide your IP too\n')
}

function listAgents(cfg) {
  const s = loadState()
  if (!cfg.agents.length) return console.log('\n  No agents yet. Create one: node null-agent.mjs add my-agent --budget 2\n')
  console.log('\n  agent                budget/day   today       total      requests  shield  models')
  for (const a of cfg.agents) {
    console.log(
      `  ${a.name.padEnd(20)} ${('$' + a.budgetUsd).padEnd(12)} ${usd(s.spent[a.name] ?? 0).padEnd(11)} ${usd(s.total[a.name] ?? 0).padEnd(10)} ${String(s.requests[a.name] ?? 0).padEnd(9)} ${(a.shield ? 'on' : 'off').padEnd(7)} ${a.models.length ? a.models.join(',') : 'any'}`,
    )
  }
  console.log()
}

// ── shielding a request, restoring a response ───────────────────────────────

/** Shields every text a request carries: message contents (string or parts) and tool-call arguments. */
function shieldRequest(body, words) {
  let map = {}
  let count = 0
  const sh = (text) => {
    if (typeof text !== 'string' || !text) return text
    const r = shield(text, detect(text, words), map)
    map = r.map
    count += r.used.length
    return r.text
  }
  for (const m of body.messages ?? []) {
    if (typeof m.content === 'string') m.content = sh(m.content)
    else if (Array.isArray(m.content)) for (const p of m.content) if (p?.type === 'text') p.text = sh(p.text)
    for (const tc of m.tool_calls ?? []) if (tc?.function) tc.function.arguments = sh(tc.function.arguments)
  }
  if (count) body.messages = [{ role: 'system', content: SHIELD_SYSTEM }, ...(body.messages ?? [])]
  return { map, count }
}

/** Restores placeholders in a stream, holding back a possibly cut-off "[NAME_" until it completes. */
class Restorer {
  constructor(map) {
    this.map = map
    this.held = ''
  }
  feed(text) {
    const s = this.held + text
    const i = s.lastIndexOf('[')
    if (i >= 0 && s.indexOf(']', i) < 0 && s.length - i <= 24) {
      this.held = s.slice(i)
      return restore(s.slice(0, i), this.map)
    }
    this.held = ''
    return restore(s, this.map)
  }
  flush() {
    const s = this.held
    this.held = ''
    return restore(s, this.map)
  }
}

function restoreMessage(msg, map) {
  if (!msg) return
  if (typeof msg.content === 'string') msg.content = restore(msg.content, map)
  for (const tc of msg.tool_calls ?? []) if (tc?.function?.arguments) tc.function.arguments = restore(tc.function.arguments, map)
}

// ── the proxy ───────────────────────────────────────────────────────────────

function sendJson(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(obj))
}
const fail = (res, status, message, type = 'null_agent_error') => sendJson(res, status, { error: { message, type } })

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function record(agent, model, cost, shielded) {
  state = state.day === today() ? state : loadState()
  state.spent[agent.name] = (state.spent[agent.name] ?? 0) + cost
  state.total[agent.name] = (state.total[agent.name] ?? 0) + cost
  state.requests[agent.name] = (state.requests[agent.name] ?? 0) + 1
  state.last[agent.name] = new Date().toISOString()
  saveState()
  // what was spent, never what was asked
  appendFileSync(USAGE, JSON.stringify({ t: new Date().toISOString(), agent: agent.name, model, cost, shielded }) + '\n')
}

async function chat(req, res, cfg, agent) {
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    return fail(res, 400, 'The request body is not valid JSON.')
  }
  body.model = ALIASES[body.model] ?? body.model
  if (agent.models.length && !agent.models.map((m) => ALIASES[m] ?? m).includes(body.model)) {
    return fail(res, 403, `Agent "${agent.name}" may only use: ${agent.models.join(', ')}.`, 'model_not_allowed')
  }
  const { map, count } = agent.shield ? shieldRequest(body, cfg.shieldWords) : { map: {}, count: 0 }

  let up
  try {
    up = await fetch(`${cfg.upstream}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer local' },
      body: JSON.stringify(body),
    })
  } catch {
    return fail(res, 502, `zkapi-clientd is not reachable at ${cfg.upstream}. Is "zkapi-clientd serve" running?`, 'upstream_unreachable')
  }

  if (!body.stream || !up.ok || !up.body) {
    const text = await up.text()
    let j = null
    try {
      j = JSON.parse(text)
    } catch {
      /* pass through as is */
    }
    if (j && up.ok) {
      for (const c of j.choices ?? []) restoreMessage(c.message, map)
      record(agent, body.model, Number(j.usage?.cost ?? 0), count)
      return sendJson(res, up.status, j)
    }
    res.writeHead(up.status, { 'content-type': up.headers.get('content-type') ?? 'application/json' })
    return res.end(text)
  }

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
  const content = new Restorer(map)
  const args = new Map()
  let cost = 0
  let last = null
  const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  const flushAll = () => {
    const rest = content.flush()
    const calls = [...args.entries()].map(([index, r]) => ({ index, function: { arguments: r.flush() } })).filter((c) => c.function.arguments)
    if ((rest || calls.length) && last) emit({ ...last, choices: [{ index: 0, delta: { ...(rest ? { content: rest } : {}), ...(calls.length ? { tool_calls: calls } : {}) } }] })
  }
  const reader = up.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '')
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) {
        if (line.startsWith(':')) res.write(`${line}\n\n`)
        continue
      }
      const data = line.slice(5).trim()
      if (data === '[DONE]') {
        flushAll()
        res.write('data: [DONE]\n\n')
        continue
      }
      let j
      try {
        j = JSON.parse(data)
      } catch {
        continue
      }
      last = { id: j.id, object: j.object, created: j.created, model: j.model }
      if (typeof j.usage?.cost === 'number') cost = j.usage.cost
      for (const c of j.choices ?? []) {
        const d = c.delta
        if (!d) continue
        if (typeof d.content === 'string') d.content = content.feed(d.content)
        for (const tc of d.tool_calls ?? []) {
          if (typeof tc.function?.arguments !== 'string') continue
          if (!args.has(tc.index)) args.set(tc.index, new Restorer(map))
          tc.function.arguments = args.get(tc.index).feed(tc.function.arguments)
        }
        if (c.finish_reason) flushAll()
      }
      emit(j)
    }
  }
  res.end()
  record(agent, body.model, cost, count)
}

function dashboard(cfg) {
  const s = loadState()
  const rows = cfg.agents
    .map((a) => {
      const spent = s.spent[a.name] ?? 0
      const pct = Math.min(100, (spent / a.budgetUsd) * 100)
      return `<tr><td>${a.name}</td><td>${usd(spent)} <span class="d">of $${a.budgetUsd}</span><div class="bar"><i style="width:${pct}%"></i></div></td><td>${usd(s.total[a.name] ?? 0)}</td><td>${s.requests[a.name] ?? 0}</td><td>${a.shield ? '<b>on</b>' : 'off'}</td><td class="d">${s.last[a.name] ? new Date(s.last[a.name]).toLocaleString() : '—'}</td></tr>`
    })
    .join('')
  let recent = []
  try {
    recent = readFileSync(USAGE, 'utf8').trim().split('\n').slice(-12).reverse().map((l) => JSON.parse(l))
  } catch {
    /* no requests yet */
  }
  const log = recent.map((r) => `<tr><td class="d">${new Date(r.t).toLocaleTimeString()}</td><td>${r.agent}</td><td class="d">${r.model}</td><td>${usd(r.cost)}</td><td>${r.shielded ? `<b>${r.shielded} hidden</b>` : '—'}</td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="10"><title>NULL Agent Kit</title><style>
body{background:#060607;color:#f1f1f3;font:14px ui-monospace,Menlo,monospace;margin:0;padding:40px}h1{font-size:18px;letter-spacing:.2em}p{color:#94949d}
table{border-collapse:collapse;width:100%;margin:12px 0 32px}td,th{border-bottom:1px solid #1d1d22;padding:10px 12px;text-align:left}th{color:#64646d;font-weight:400;font-size:11px;letter-spacing:.14em}
.d{color:#64646d}b{color:#43d392;font-weight:400}.bar{height:3px;background:#1d1d22;margin-top:6px;width:140px}.bar i{display:block;height:3px;background:#8a98ff}</style></head><body>
<h1>∅ NULL · AGENT KIT</h1><p>http://127.0.0.1:${cfg.port}/v1 → ${cfg.upstream} · paid privately via zkAPI · nothing here leaves this machine</p>
<table><tr><th>AGENT</th><th>TODAY</th><th>TOTAL</th><th>REQUESTS</th><th>SHIELD</th><th>LAST REQUEST</th></tr>${rows || '<tr><td colspan=6 class="d">no agents yet</td></tr>'}</table>
<table><tr><th>TIME</th><th>AGENT</th><th>MODEL</th><th>COST</th><th>PROMPT SHIELD</th></tr>${log || '<tr><td colspan=5 class="d">no requests yet</td></tr>'}</table></body></html>`
}

function serve(cfg) {
  if (!cfg.agents.length) throw new Error('No agent keys yet. Run: node null-agent.mjs add my-agent')
  state = loadState()
  const own = [`http://127.0.0.1:${cfg.port}`, `http://localhost:${cfg.port}`]
  const server = http.createServer(async (req, res) => {
    try {
      // web pages must not be able to spend your balance
      if (req.headers.origin && !own.includes(req.headers.origin)) return fail(res, 403, 'Browser origins are not allowed.')
      const path = new URL(req.url ?? '/', 'http://x').pathname
      if (req.method === 'GET' && (path === '/' || path === '/dashboard')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        return res.end(dashboard(loadConfig()))
      }
      const cfgNow = loadConfig()
      const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
      const agent = cfgNow.agents.find((a) => a.keyHash === hashKey(token))
      if (!agent) return fail(res, 401, 'Unknown NULL agent key. Create one with: node null-agent.mjs add <name>', 'invalid_api_key')
      state = state.day === today() ? state : loadState()
      if ((state.spent[agent.name] ?? 0) >= agent.budgetUsd) {
        return fail(res, 429, `Agent "${agent.name}" used its $${agent.budgetUsd} budget for today. It resets at 00:00 UTC.`, 'budget_exceeded')
      }
      if (req.method === 'GET' && path === '/v1/models') {
        const up = await fetch(`${cfgNow.upstream}/models`).catch(() => null)
        if (!up) return fail(res, 502, `zkapi-clientd is not reachable at ${cfgNow.upstream}.`, 'upstream_unreachable')
        res.writeHead(up.status, { 'content-type': 'application/json' })
        return res.end(await up.text())
      }
      if (req.method === 'POST' && path === '/v1/chat/completions') return await chat(req, res, cfgNow, agent)
      return fail(res, 404, 'NULL Agent Kit serves /v1/chat/completions and /v1/models.', 'not_found')
    } catch (e) {
      if (!res.headersSent) fail(res, 500, e?.message ?? String(e))
      else res.end()
    }
  })
  server.listen(cfg.port, '127.0.0.1', () => {
    console.log(`\n  ∅ NULL Agent Kit ${VERSION}`)
    console.log(`  API        http://127.0.0.1:${cfg.port}/v1   (OpenAI-compatible)`)
    console.log(`  dashboard  http://127.0.0.1:${cfg.port}`)
    console.log(`  upstream   ${cfg.upstream}   (zkapi-clientd)`)
    console.log(`  agents     ${cfg.agents.map((a) => a.name).join(', ')}\n`)
  })
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, name] = process.argv.slice(2)
  const cfg = loadConfig()
  if (arg('upstream')) cfg.upstream = arg('upstream')
  if (arg('port')) cfg.port = Number(arg('port'))
  switch (cmd) {
    case 'init': {
      const fresh = !existsSync(CONFIG)
      saveConfig(cfg)
      console.log(`\n  ∅ NULL Agent Kit ${VERSION} · config ${CONFIG}`)
      if (fresh || !cfg.agents.length) printKey('my-agent', createAgent(cfg, 'my-agent', { budget: arg('budget', 1) }), cfg)
      console.log(CHECKLIST)
      break
    }
    case 'add': {
      if (!name) throw new Error('Usage: node null-agent.mjs add <name> [--budget 2] [--models claude,grok] [--no-shield]')
      const key = createAgent(cfg, name, { budget: arg('budget', 1), models: arg('models'), shield: !process.argv.includes('--no-shield') })
      printKey(name, key, cfg)
      break
    }
    case 'remove': {
      const before = cfg.agents.length
      cfg.agents = cfg.agents.filter((a) => a.name !== name)
      saveConfig(cfg)
      console.log(before > cfg.agents.length ? `\n  Removed "${name}". Its key no longer works.\n` : `\n  No agent called "${name}".\n`)
      break
    }
    case 'agents':
      listAgents(cfg)
      break
    case 'doctor':
      await doctor(cfg)
      break
    case 'serve':
      serve(cfg)
      break
    default:
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 21).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  }
}

main().catch((e) => {
  console.error(`\n  ${e.message ?? e}\n`)
  process.exit(1)
})

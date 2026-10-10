import type { ZkClient } from '@openanonymity/zkapi-browser-sdk'
import { readStream, type Source } from '../live/stream'
import { sleep } from '../lib/random'
import { cannedSearch } from '../protocol/responses'
import { SYSTEM, textOf, withKey, type KeyHooks, type WireMessage } from './engine'
import { SHIELD_SYSTEM } from './shield'

/**
 * Private Deep Research: the model plans a few web searches, they run in parallel, and the
 * model writes a report from what they found, citing numbered sources. Every call is paid
 * from the private balance on this chat's key, like any other message. The question is
 * shielded before planning, and no placeholder ([NAME_1]…) ever goes into a search query.
 */

export interface ResearchStep {
  q: string
  status: 'pending' | 'searching' | 'done' | 'error'
  sources: number
}

export interface ResearchHooks extends KeyHooks {
  onPlan: (queries: string[]) => void
  onStep: (i: number, step: Partial<ResearchStep>) => void
  onDelta: (text: string) => void
  onSources: (s: Source[]) => void
  /** running total of what the research cost so far (USD, as OpenRouter reports it) */
  onCost: (usd: number) => void
  shield?: boolean
}

const MAX_QUERIES = 5
const PARALLEL = 3
const TAG = /\[(?:EMAIL|PHONE|WALLET|SECRET|IBAN|CARD|IP|ADDRESS|DATE|AGE|NAME|PLACE|ORG|ID|CUSTOM)_\d{1,3}\]/gi

const PLAN_SYSTEM =
  'You plan web research for the question you are given. Reply with JSON only, no prose: {"queries": ["…", "…"]}. ' +
  'Give 3 to 5 short, specific search-engine queries that together answer the question from different angles ' +
  '(facts, recent changes, numbers, criticism). Some details in the question may be placeholders like [NAME_1]: never put a placeholder in a query, leave that detail out.'

const SEARCH_SYSTEM =
  'Search the web for the query and report what you find: 4 to 8 bullet points with concrete facts, numbers and dates, ' +
  'each naming its source. Under 200 words. No introduction.'

const WRITE_SYSTEM =
  'You write a research report from research notes. Use only facts from the notes. Cite with the numbers of the source list, like [2] or [1][4], right after the claim. ' +
  'Structure: a short answer in 2 to 3 sentences, then sections with headings, then "Open questions" if the notes leave gaps. ' +
  'Never invent sources or numbers. Write in the language of the question.'

/** Turns the planner's reply into clean queries (falls back to the question itself). */
export function parseQueries(reply: string, question: string): string[] {
  let list: string[] = []
  try {
    const json = JSON.parse(reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1)) as { queries?: unknown }
    if (Array.isArray(json.queries)) list = json.queries.filter((q): q is string => typeof q === 'string')
  } catch {
    list = reply.split('\n').map((l) => l.replace(/^[\s\-*\d.)"]+|["\s,]+$/g, ''))
  }
  // a query that names a placeholder is dropped whole: what is left would be a bad search anyway
  const clean = [...new Set(list.map((q) => q.replace(/\s+/g, ' ').trim()).filter((q) => q.length > 3 && !/:$/.test(q) && !new RegExp(TAG.source, 'i').test(q)))]
  const fallback = question
    .replace(new RegExp(String.raw`\b(?:of|at|in|about|for|from|with|to|by|on|and)?\s*` + TAG.source, 'gi'), ' ')
    .replace(/\s+([?.!,])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  return (clean.length ? clean : [fallback]).slice(0, MAX_QUERIES)
}

/** One non-streamed call on this chat's key: text, web citations and what it cost. */
async function complete(
  client: ZkClient,
  sessionId: string,
  model: string,
  messages: WireMessage[],
  opts: { web?: boolean },
  hooks: KeyHooks,
  phase: string,
): Promise<{ text: string; sources: Source[]; cost: number }> {
  let out = { text: '', sources: [] as Source[], cost: 0 }
  await withKey(
    client,
    sessionId,
    hooks,
    phase,
    (access) =>
      fetch(`${access.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: access.headers,
        body: JSON.stringify({ model, messages, ...(opts.web ? { plugins: [{ id: 'web', max_results: 5 }] } : {}) }),
        signal: hooks.signal,
      }),
    async (res) => {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string; annotations?: { type?: string; url_citation?: { url?: string; title?: string } }[] } }[]
        usage?: { cost?: number }
        error?: { message?: string }
      }
      if (json.error) throw new Error(json.error.message ?? 'Provider error')
      const msg = json.choices?.[0]?.message
      const sources: Source[] = []
      for (const a of msg?.annotations ?? []) {
        const url = a.url_citation?.url
        if (a.type === 'url_citation' && url && /^https?:\/\//.test(url) && !sources.some((s) => s.url === url)) sources.push({ url, title: a.url_citation?.title || url })
      }
      out = { text: msg?.content ?? '', sources, cost: json.usage?.cost ?? 0 }
    },
  )
  return out
}

/** Runs `jobs` with at most `n` at a time, keeping their order. */
async function pool<T>(jobs: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = new Array(jobs.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++
        out[i] = await jobs[i]()
      }
    }),
  )
  return out
}

interface Finding {
  q: string
  text: string
  sources: Source[]
}

/** Numbers every source once, across all searches, and writes the notes the report is based on. */
function notes(findings: Finding[]): { all: Source[]; brief: string } {
  const all: Source[] = []
  const index = new Map<string, number>()
  for (const f of findings)
    for (const s of f.sources)
      if (!index.has(s.url)) {
        index.set(s.url, all.length + 1)
        all.push(s)
      }
  const brief = findings
    .map((f, i) => `### Search ${i + 1}: ${f.q}\n${f.text.trim() || '(nothing found)'}\nSources for this search: ${f.sources.map((s) => `[${index.get(s.url)}]`).join(' ') || 'none'}`)
    .join('\n\n')
  const list = all.map((s, i) => `[${i + 1}] ${s.title} (${s.url})`).join('\n')
  return { all, brief: `${brief}\n\nNumbered sources:\n${list || '(none)'}` }
}

/** A research run on the live zkAPI deployment, the report streamed. */
export async function researchLive(client: ZkClient, sessionId: string, model: string, history: WireMessage[], hooks: ResearchHooks): Promise<void> {
  const last = history[history.length - 1]
  const question = last ? textOf(last.content) : ''
  let spent = 0
  const add = (usd: number) => {
    spent += usd
    hooks.onCost(spent)
  }

  const plan = await complete(client, sessionId, model, [{ role: 'system', content: PLAN_SYSTEM }, { role: 'user', content: question }], {}, hooks, 'Planning the research…')
  add(plan.cost)
  const queries = parseQueries(plan.text, question)
  hooks.onPlan(queries)

  hooks.onPhase(`Searching the web privately (${queries.length} searches)…`)
  const findings = await pool(
    queries.map((q, i) => async (): Promise<Finding> => {
      hooks.onStep(i, { status: 'searching' })
      try {
        const r = await complete(client, sessionId, model, [{ role: 'system', content: SEARCH_SYSTEM }, { role: 'user', content: q }], { web: true }, { ...hooks, onPhase: () => {} }, '')
        add(r.cost)
        hooks.onStep(i, { status: 'done', sources: r.sources.length })
        return { q, text: r.text, sources: r.sources }
      } catch (e) {
        if (hooks.signal?.aborted) throw e
        hooks.onStep(i, { status: 'error' })
        return { q, text: '', sources: [] }
      }
    }),
    PARALLEL,
  )
  if (findings.every((f) => !f.text.trim())) throw new Error('The searches came back empty. Try asking the question another way.')
  const { all, brief } = notes(findings)
  hooks.onSources(all)

  await withKey(
    client,
    sessionId,
    hooks,
    'Writing the report…',
    (access) =>
      fetch(`${access.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: access.headers,
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            SYSTEM,
            ...(hooks.shield ? [{ role: 'system', content: SHIELD_SYSTEM }] : []),
            { role: 'system', content: WRITE_SYSTEM },
            ...history.slice(0, -1),
            { role: 'user', content: `${question}\n\n---\nResearch notes:\n\n${brief}` },
          ],
        }),
        signal: hooks.signal,
      }),
    async (res) => {
      hooks.onPhase('')
      await readStream(res, hooks.onDelta, hooks.signal, undefined, (usd) => add(usd))
    },
  )
}

/** Demo mode: the same steps with canned searches, labelled as a demo. */
export async function researchDemo(history: WireMessage[], hooks: ResearchHooks): Promise<void> {
  const last = history[history.length - 1]
  const question = (last ? textOf(last.content) : '').replace(TAG, ' ').replace(/\s+/g, ' ').trim() || 'private AI payments'
  const topic = question.replace(/[?.!]+$/, '').slice(0, 60)
  hooks.onPhase('Generating proof…')
  await sleep(500)
  hooks.onPhase('Planning the research…')
  await sleep(900)
  const queries = [topic, `${topic} explained simply`, `${topic} latest changes 2026`, `${topic} risks and criticism`]
  hooks.onPlan(queries)
  hooks.onPhase(`Searching the web privately (${queries.length} searches)…`)
  const findings: Finding[] = []
  // canned results repeat across queries: give each search sources no earlier one had
  const seen = new Set<string>()
  const picks = queries.map((q, i) =>
    cannedSearch(q)
      .filter((h) => !h.url.startsWith('nullzk.com'))
      .filter((h) => !seen.has(h.title) && (seen.add(h.title), true))
      .map((h) => ({ url: `https://${h.url}`, title: h.title }))
      .slice(0, 1 + (i % 2)),
  )
  await Promise.all(
    queries.map(async (q, i) => {
      await sleep(250 * i)
      hooks.onStep(i, { status: 'searching' })
      await sleep(1100 + 350 * i)
      const sources = picks[i]
      findings[i] = { q, text: '', sources }
      hooks.onStep(i, { status: 'done', sources: sources.length })
      hooks.onCost(0.012 * (findings.filter(Boolean).length + 1))
    }),
  )
  const { all } = notes(findings)
  hooks.onSources(all)
  hooks.onPhase('Writing the report…')
  await sleep(700)
  hooks.onPhase('')
  const text = [
    `**Demo report.** In live mode the model you picked reads the ${queries.length} searches and writes this report from them, citing each claim like this [1].`,
    '',
    '## What the searches covered',
    ...queries.map((q, i) => `- **${q}**: ${findings[i].sources.length} sources [${findings[i].sources.map((s) => all.indexOf(s) + 1).join('][')}]`),
    '',
    '## How the research ran',
    '- Your question was shielded first; no placeholder went into a search.',
    `- ${queries.length} web searches ran in parallel on this chat's key, paid with a zero-knowledge proof.`,
    '- The report cites only what the searches returned.',
  ].join('\n')
  for (let i = 0; i < text.length; ) {
    if (hooks.signal?.aborted) return
    const n = 3 + Math.floor(Math.random() * 5)
    hooks.onDelta(text.slice(i, i + n))
    i += n
    await sleep(14)
  }
  hooks.onCost(0.071)
}

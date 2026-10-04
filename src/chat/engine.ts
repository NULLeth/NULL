import type { ZkAccess, ZkClient } from '@openanonymity/zkapi-browser-sdk'
import { LIVE } from '../config/mode'
import { sleep } from '../lib/random'
import { cannedChat } from '../protocol/responses'
import { cannedSearch } from '../protocol/responses'
import { providerError, readStream, type Source } from '../live/stream'
import { SHIELD_SYSTEM } from './shield'

export interface WireMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface KeyHooks {
  /** short status line while the request is being authorized / running */
  onPhase: (text: string) => void
  signal?: AbortSignal
}

export interface SendHooks extends KeyHooks {
  onDelta: (text: string) => void
  /** web-search citations, when web search is on */
  onSources?: (s: Source[]) => void
  /** answer with live web results (OpenRouter web plugin) */
  web?: boolean
  /** the history carries Prompt Shield placeholders */
  shield?: boolean
  /** what this answer cost, in USD, as reported by OpenRouter */
  onCost?: (usd: number) => void
}

export interface ImageRequest {
  prompt: string
  aspect: string
  /** the previous image as a data URL, when this prompt edits it */
  reference?: string | null
}

export interface GeneratedImage {
  dataUrl: string
  /** what OpenRouter charged for it, when reported */
  costUsd?: number
}

/** OpenRouter's web plugin: a handful of results, engine picked by OpenRouter. */
const WEB_PLUGIN = { id: 'web', max_results: 5 }

const SYSTEM: WireMessage = {
  role: 'system',
  content: 'You are a helpful assistant reached through NULL, a private payment layer. Answer clearly and concisely.',
}

type SdkError = Error & { code?: string; status?: number }

/**
 * Runs one request on the live zkAPI deployment with this conversation's key.
 * Each conversation owns its own short-lived key (sessionId = conversation id):
 * the key is reused for the conversation's next messages and settled before
 * another conversation starts. If the key's cap is used up, it is settled and
 * renewed once.
 */
async function withKey(
  client: ZkClient,
  sessionId: string,
  hooks: KeyHooks,
  phase: string,
  request: (access: ZkAccess) => Promise<Response>,
  consume: (res: Response) => Promise<void>,
): Promise<void> {
  const acquire = async () =>
    client.acquireInferenceAccess(sessionId, {
      spendingLimitUsd: LIVE.spendingLimitUsd,
      signal: hooks.signal,
      onProgress: (p) => hooks.onPhase(p.message),
    })

  let access
  try {
    access = await acquire()
  } catch (err) {
    const code = (err as SdkError).code
    if (code !== 'lease_session_conflict') throw err
    // another conversation still holds the key: settle it, then take a fresh one
    hooks.onPhase('Closing the previous chat’s key…')
    await client.settleActiveLease(hooks.onPhase)
    access = await acquire()
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    hooks.onPhase(phase)
    let res: Response
    try {
      res = await request(access)
    } catch (e) {
      access.release()
      throw e
    }
    // the key's spending cap is used up: settle it and continue with a new key once
    if ((res.status === 402 || res.status === 403) && attempt === 0) {
      access.release()
      hooks.onPhase('Key budget used up, settling and renewing…')
      await client.settleActiveLease(hooks.onPhase, { sessionId })
      access = await acquire()
      continue
    }
    try {
      if (!res.ok || !res.body) throw new Error(await providerError(res))
      await consume(res)
      return
    } finally {
      access.release()
    }
  }
}

/** One chat turn on the live zkAPI deployment, streamed. */
export async function sendLive(client: ZkClient, sessionId: string, model: string, history: WireMessage[], hooks: SendHooks): Promise<void> {
  await withKey(
    client,
    sessionId,
    hooks,
    hooks.web ? 'Searching the web privately…' : 'Routing privately…',
    (access) =>
      fetch(`${access.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: access.headers,
        body: JSON.stringify({
          model,
          stream: true,
          messages: [SYSTEM, ...(hooks.shield ? [{ role: 'system', content: SHIELD_SYSTEM }] : []), ...history],
          ...(hooks.web ? { plugins: [WEB_PLUGIN] } : {}),
        }),
        signal: hooks.signal,
      }),
    async (res) => {
      hooks.onPhase('')
      await readStream(res, hooks.onDelta, hooks.signal, hooks.onSources, hooks.onCost)
    },
  )
}

/** One image on the live zkAPI deployment, via OpenRouter's image API. */
export async function sendImageLive(client: ZkClient, sessionId: string, model: string, req: ImageRequest, hooks: KeyHooks): Promise<GeneratedImage> {
  let out: GeneratedImage | null = null
  await withKey(
    client,
    sessionId,
    hooks,
    req.reference ? 'Editing your image privately…' : 'Painting your image privately…',
    (access) =>
      fetch(`${access.baseUrl}/images`, {
        method: 'POST',
        headers: access.headers,
        body: JSON.stringify({
          model,
          prompt: req.prompt,
          aspect_ratio: req.aspect,
          resolution: '1K',
          n: 1,
          ...(req.reference ? { input_references: [{ type: 'image_url', image_url: { url: req.reference } }] } : {}),
        }),
        signal: hooks.signal,
      }),
    async (res) => {
      const json = (await res.json()) as { data?: { b64_json?: string; media_type?: string }[]; usage?: { cost?: number } }
      const img = json.data?.[0]
      if (!img?.b64_json) throw new Error('The image model returned no image. Try rewording the prompt.')
      out = { dataUrl: `data:${img.media_type || 'image/png'};base64,${img.b64_json}`, costUsd: json.usage?.cost }
      hooks.onPhase('')
    },
  )
  if (!out) throw new Error('No image came back.')
  return out
}

/** Demo mode: the canned router, streamed so it feels like the real thing. */
export async function sendDemo(model: string, history: WireMessage[], hooks: SendHooks): Promise<void> {
  const last = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''
  hooks.onPhase('Generating proof…')
  await sleep(650)
  hooks.onPhase('Request authorized…')
  await sleep(350)
  hooks.onPhase(hooks.web ? 'Searching the web privately…' : 'Routing privately…')
  await sleep(hooks.web ? 900 : 450)
  hooks.onPhase('')
  if (hooks.web) hooks.onSources?.(cannedSearch(last).filter((h) => !h.url.startsWith('nullzk.com')).map((h) => ({ url: `https://${h.url}`, title: h.title })))
  const tags = [...new Set(last.match(/\[[A-Z]+_\d+\]/g) ?? [])]
  const text = hooks.shield && tags.length ? shieldDemo(tags) : cannedChat(last, model)
  for (let i = 0; i < text.length; ) {
    if (hooks.signal?.aborted) return
    const n = 3 + Math.floor(Math.random() * 5)
    hooks.onDelta(text.slice(i, i + n))
    i += n
    await sleep(16)
  }
  hooks.onCost?.(demoCost(model, history, text))
}

/** Demo only: a plausible per-answer cost from rough token counts and the model's price tier. */
function demoCost(model: string, history: WireMessage[], answer: string): number {
  const tokens = (history.reduce((n, m) => n + m.content.length, 0) + answer.length) / 4
  const tier = /opus/.test(model) ? 2.5 : /haiku|luna|flash|deepseek|glm|llama|mistral/.test(model) ? 0.2 : 1
  return tokens * 0.000006 * tier
}

/** Demo answer for a shielded prompt: written with the placeholders only, like a real model would. */
function shieldDemo(tags: string[]): string {
  const name = tags.find((t) => t.startsWith('[NAME_'))
  const contact = tags.filter((t) => /^\[(PHONE|EMAIL)_/.test(t))
  const address = tags.find((t) => t.startsWith('[ADDRESS_'))
  return [
    'Here’s a short draft. I only saw placeholders; your browser filled the real details back in.',
    '',
    `Hi ${name ?? 'there'},`,
    '',
    address ? `I’m writing to let you know that I’ll be moving out of ${address} at the end of next month. Thank you for everything.` : 'Thanks for getting back to me so quickly.',
    ...(contact.length ? ['', `You can reach me any time at ${contact.join(' or ')}.`] : []),
    '',
    'Best regards',
  ].join('\n')
}

const ASPECT_PX: Record<string, [number, number]> = { '1:1': [1024, 1024], '16:9': [1344, 768], '9:16': [768, 1344] }

/** Demo mode: a placeholder picture drawn in the browser, labelled as a demo. */
export async function sendImageDemo(req: ImageRequest, hooks: KeyHooks): Promise<GeneratedImage> {
  hooks.onPhase('Generating proof…')
  await sleep(650)
  hooks.onPhase('Request authorized…')
  await sleep(350)
  hooks.onPhase(req.reference ? 'Editing your image privately…' : 'Painting your image privately…')
  await sleep(1400)
  if (hooks.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const [w, h] = ASPECT_PX[req.aspect] ?? ASPECT_PX['1:1']
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  let seed = [...req.prompt].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const hue = Math.floor(rnd() * 360)
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, `hsl(${hue} 55% 18%)`)
  g.addColorStop(1, `hsl(${(hue + 60) % 360} 60% 8%)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 14; i++) {
    const x = rnd() * w
    const y = rnd() * h
    const r = 80 + rnd() * Math.min(w, h) * 0.4
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, `hsla(${(hue + rnd() * 90) % 360} 80% 65% / 0.35)`)
    rg.addColorStop(1, 'hsla(0 0% 0% / 0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.min(w, h) * 0.018
  const cx = w / 2
  const cy = h / 2 - Math.min(w, h) * 0.06
  const r = Math.min(w, h) * 0.12
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.9, cy + r * 0.9)
  ctx.lineTo(cx + r * 0.9, cy - r * 0.9)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'center'
  ctx.font = `600 ${Math.round(Math.min(w, h) * 0.04)}px system-ui, sans-serif`
  const label = req.prompt.length > 48 ? `${req.prompt.slice(0, 47)}…` : req.prompt
  ctx.fillText(label, cx, cy + r * 2.1)
  ctx.font = `500 ${Math.round(Math.min(w, h) * 0.024)}px ui-monospace, monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText('DEMO IMAGE · live mode uses a real image model', cx, cy + r * 2.75)
  hooks.onPhase('')
  return { dataUrl: c.toDataURL('image/jpeg', 0.9), costUsd: 0.067 }
}

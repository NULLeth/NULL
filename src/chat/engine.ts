import type { ZkClient } from '@openanonymity/zkapi-browser-sdk'
import { LIVE } from '../config/mode'
import { sleep } from '../lib/random'
import { cannedChat } from '../protocol/responses'
import { providerError, readStream } from '../live/stream'

export interface WireMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface SendHooks {
  /** short status line while the request is being authorized / streamed */
  onPhase: (text: string) => void
  onDelta: (text: string) => void
  signal?: AbortSignal
}

const SYSTEM: WireMessage = {
  role: 'system',
  content: 'You are a helpful assistant reached through NULL, a private payment layer. Answer clearly and concisely.',
}

type SdkError = Error & { code?: string; status?: number }

/**
 * One chat turn on the live zkAPI deployment. Each conversation owns its own
 * short-lived key (sessionId = conversation id): the key is reused for the
 * conversation's next messages and settled before another conversation starts.
 */
export async function sendLive(client: ZkClient, sessionId: string, model: string, history: WireMessage[], hooks: SendHooks): Promise<void> {
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
    hooks.onPhase('Routing privately…')
    let res: Response
    try {
      res = await fetch(`${access.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: access.headers,
        body: JSON.stringify({ model, stream: true, messages: [SYSTEM, ...history] }),
        signal: hooks.signal,
      })
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
      hooks.onPhase('')
      await readStream(res, hooks.onDelta, hooks.signal)
      return
    } finally {
      access.release()
    }
  }
}

/** Demo mode: the canned router, streamed so it feels like the real thing. */
export async function sendDemo(model: string, history: WireMessage[], hooks: SendHooks): Promise<void> {
  const last = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''
  hooks.onPhase('Generating proof…')
  await sleep(650)
  hooks.onPhase('Request authorized…')
  await sleep(350)
  hooks.onPhase('Routing privately…')
  await sleep(450)
  hooks.onPhase('')
  const text = cannedChat(last, model)
  for (let i = 0; i < text.length; ) {
    if (hooks.signal?.aborted) return
    const n = 3 + Math.floor(Math.random() * 5)
    hooks.onDelta(text.slice(i, i + n))
    i += n
    await sleep(16)
  }
}

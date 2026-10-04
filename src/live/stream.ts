export interface Source {
  url: string
  title: string
}

interface Annotation {
  type?: string
  url_citation?: { url?: string; title?: string }
}

/** Web-search citations (OpenRouter `annotations`), de-duplicated by URL. */
function sourcesFrom(list: Annotation[] | undefined): Source[] {
  const out: Source[] = []
  for (const a of list ?? []) {
    const url = a.url_citation?.url
    if (a.type === 'url_citation' && url && /^https?:\/\//.test(url)) out.push({ url, title: a.url_citation?.title || url })
  }
  return out
}

/**
 * Reads an OpenAI-style SSE stream: onDelta gets each text chunk, onSources gets
 * any web-search citations as they arrive, onCost gets what OpenRouter charged
 * (usage.cost, in USD, sent with the last chunk).
 */
export async function readStream(
  res: Response,
  onDelta: (t: string) => void,
  signal?: AbortSignal,
  onSources?: (s: Source[]) => void,
  onCost?: (usd: number) => void,
) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => {})
      return
    }
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string; annotations?: Annotation[] }; message?: { annotations?: Annotation[] } }[]
          error?: { message?: string }
          usage?: { cost?: number }
        }
        if (json.error) throw new Error(json.error.message ?? 'Provider error')
        if (typeof json.usage?.cost === 'number' && onCost) onCost(json.usage.cost)
        const choice = json.choices?.[0]
        const t = choice?.delta?.content
        if (t) onDelta(t)
        const found = sourcesFrom(choice?.delta?.annotations ?? choice?.message?.annotations)
        if (found.length && onSources) onSources(found)
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}

/** Best-effort error text from a non-OK provider response. */
export async function providerError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string } }
    const msg = j.error?.message
    if (msg && /no endpoints|data policy|not a valid model|model.*(not found|does not exist|unavailable)/i.test(msg)) {
      return `This model isn't available through zkAPI right now. Pick another model. (${res.status}: ${msg})`
    }
    if (msg) return `${res.status}: ${msg}`
  } catch {
    /* not JSON */
  }
  return `Provider returned ${res.status}`
}

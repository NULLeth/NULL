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
 * any web-search citations as they arrive.
 */
export async function readStream(res: Response, onDelta: (t: string) => void, signal?: AbortSignal, onSources?: (s: Source[]) => void) {
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
        }
        if (json.error) throw new Error(json.error.message ?? 'Provider error')
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
    if (j.error?.message) return `${res.status}: ${j.error.message}`
  } catch {
    /* not JSON */
  }
  return `Provider returned ${res.status}`
}

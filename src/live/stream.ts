/** Reads an OpenAI-style SSE stream and calls onDelta with each text chunk. */
export async function readStream(res: Response, onDelta: (t: string) => void, signal?: AbortSignal) {
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
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } }
        if (json.error) throw new Error(json.error.message ?? 'Provider error')
        const t = json.choices?.[0]?.delta?.content
        if (t) onDelta(t)
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

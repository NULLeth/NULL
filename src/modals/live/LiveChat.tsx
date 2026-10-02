import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { TerminalSteps, useSteps, type StepDef } from '../../components/ui/TerminalSteps'
import { LIVE } from '../../config/mode'
import { fmtEth, fmtUsd } from '../../lib/format'
import { randId } from '../../lib/random'
import { errorMessage } from '../../live/client'
import { useLive } from '../../live/LiveProvider'
import type { ServiceInfo } from '../../protocol'
import { useUi } from '../../state/ui'

const STEPS: StepDef[] = [
  { id: 'prove', label: 'Generating proof...' },
  { id: 'authorize', label: 'Request authorized...' },
  { id: 'route', label: 'Routing privately...' },
  { id: 'done', label: 'Response received.' },
]

const SUGGESTIONS = ['Explain Ethereum blobs in simple terms.', 'What does a nullifier do?', 'Summarize EIP-7702.', 'Write a haiku about private payments.']

/** Reads an OpenAI-style SSE stream and calls onDelta with each text chunk. */
async function readStream(res: Response, onDelta: (t: string) => void) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
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

/** Real private chat through zkAPI: proof → short-lived key → OpenRouter, straight from the browser. */
export function LiveChat({ svc, onDone }: { svc: ServiceInfo; onDone: (requestId: string) => void }) {
  const live = useLive()
  const ui = useUi()
  const model = LIVE.models[svc.id] ?? 'openrouter/auto'
  const [input, setInput] = useState(SUGGESTIONS[0])
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [settle, setSettle] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ ms: number; req: string } | null>(null)
  const steps = useSteps(STEPS)
  const session = useRef(randId('ses', 10))
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPhase('idle')
    setText('')
    setError(null)
    setSettle(null)
    steps.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc.id])

  const ready = live?.status === 'ready'
  const funded = !!live?.hasNote && live.balanceEth > 0

  const send = async () => {
    if (!live || !input.trim() || phase === 'running') return
    setPhase('running')
    setText('')
    setError(null)
    setSettle(null)
    steps.reset()
    const before = live.balanceEth
    const t0 = performance.now()
    let lastProgress = ''
    try {
      const client = await live.client()
      steps.onStep({ step: 'prove', phase: 'start' })
      const access = await client.acquireInferenceAccess(session.current, {
        spendingLimitUsd: LIVE.spendingLimitUsd,
        onProgress: (p) => (lastProgress = p.message),
      })
      steps.onStep({ step: 'prove', phase: 'done', detail: lastProgress || 'proof accepted by zkAPI' })
      steps.onStep({ step: 'authorize', phase: 'start' })
      steps.onStep({ step: 'authorize', phase: 'done', detail: `temporary key · capped at ${fmtUsd(access.spendingLimitUsd, { cents: true })} · no account` })
      steps.onStep({ step: 'route', phase: 'start' })
      let res: Response
      try {
        res = await fetch(`${access.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: access.headers,
          body: JSON.stringify({ model, stream: true, messages: [{ role: 'user', content: input.trim() }] }),
        })
        if (!res.ok || !res.body) throw new Error(`Provider returned ${res.status}`)
        steps.onStep({ step: 'route', phase: 'done', detail: `direct to OpenRouter · ${model}` })
        steps.onStep({ step: 'done', phase: 'start' })
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
        await readStream(res, (d) => setText((t) => t + d))
      } finally {
        access.release()
      }
      const ms = performance.now() - t0
      steps.onStep({ step: 'done', phase: 'done', detail: `200 OK · ${(ms / 1000).toFixed(2)} s` })
      const req = randId('req', 10)
      setMeta({ ms, req })
      setPhase('done')
      onDone(req)
      // Close the key so the real usage is charged and the balance updates.
      setSettle('Settling usage…')
      client
        .settleActiveLease((m) => setSettle(m), { sessionId: session.current })
        .then(async () => {
          await live.refresh()
          const after = (await live.client()).note?.current_balance
          const spentEth = after != null ? before - after / 1e9 : 0
          const usd = live.ethUsd ? spentEth * live.ethUsd : null
          setSettle(`Settled · charged ${fmtEth(spentEth, 6)} ETH${usd != null ? ` (${fmtUsd(usd, { micro: true })})` : ''}`)
          live.addLog({ kind: 'request', actor: 'YOU', serviceId: svc.id, costUsd: usd ?? 0, detail: `chat · ${model}` })
        })
        .catch(() => setSettle('Usage settles automatically when the temporary key expires.'))
    } catch (err) {
      setError(errorMessage(err))
      setPhase('error')
    }
  }

  if (!ready) {
    return <p className="font-mono text-[12.5px] text-muted">{live?.status === 'error' ? `zkAPI could not start: ${live.error}` : 'Connecting to zkAPI on Ethereum mainnet…'}</p>
  }

  return (
    <div>
      <textarea
        data-autofocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
        }}
        disabled={phase === 'running'}
        rows={3}
        placeholder="Ask privately..."
        className="block w-full resize-none rounded-md border border-line-2 bg-white/[0.015] px-4 py-3 text-[14.5px] leading-relaxed text-fg outline-none transition-colors focus:border-line-3 disabled:opacity-60"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={phase === 'running'}
            onClick={() => setInput(s)}
            className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:border-line-3 hover:text-fg disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {!funded ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-2 px-4 py-3">
          <span className="text-[13px] text-muted">Fund a private balance on mainnet to send a real request.</span>
          <Button size="sm" variant="primary" onClick={() => ui.open({ name: 'fund' })}>
            Fund
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={send} disabled={!input.trim()} loading={phase === 'running'} icon={phase === 'running' ? undefined : <Send className="size-3.5" />}>
            Send private request
          </Button>
          <span className="font-mono text-[11px] text-dim">metered by tokens · key capped at {fmtUsd(LIVE.spendingLimitUsd, { cents: true })} · {model}</span>
        </div>
      )}

      {error && <div className="mt-4 rounded-md border border-bad/25 bg-bad/[0.05] px-4 py-3 text-[13px] text-bad/90">{error}</div>}

      {phase !== 'idle' && (
        <div className="mt-5 rounded-md border border-line bg-[#08080a] px-4 py-2">
          <TerminalSteps defs={STEPS} state={steps.state} />
        </div>
      )}

      {(text || phase === 'done') && (
        <motion.div ref={resultRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 overflow-hidden rounded-md border border-line-2">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-white/[0.015] px-4 py-2.5">
            <span className="label !text-[10px] text-muted">RESPONSE · {model}</span>
            <span className="rounded-[3px] border border-ok/25 px-1.5 py-px font-mono text-[9.5px] tracking-[0.12em] text-ok/90">LIVE</span>
          </div>
          <div className="whitespace-pre-wrap px-4 py-4 text-[14px] leading-[1.7] text-soft">
            {text}
            {phase === 'running' && <span className="ml-px inline-block w-[7px] animate-blink text-eth">▍</span>}
          </div>
          {phase === 'done' && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-4 py-2.5 font-mono text-[10.5px] text-dim">
              {meta && (
                <span>
                  LATENCY <span className="text-muted">{(meta.ms / 1000).toFixed(2)}s</span>
                </span>
              )}
              {settle && <span className="text-muted">{settle}</span>}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

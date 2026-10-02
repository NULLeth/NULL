import { motion } from 'framer-motion'
import { ArrowUpRight, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GenerativeImage } from '../components/GenerativeImage'
import { ServiceIcon, ServiceIconTile } from '../components/ServiceIcon'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Button } from '../components/ui/Button'
import { CopyAddress } from '../components/ui/CopyAddress'
import { Modal } from '../components/ui/Modal'
import { TerminalSteps, useSteps, type StepDef } from '../components/ui/TerminalSteps'
import { fmtEth, fmtInt, fmtUsd, usdToEth } from '../lib/format'
import { backend, SERVICES, serviceById, type AccessProof, type ServiceId, type ServiceResponse } from '../protocol'
import { RPC_METHODS, type RpcMethod } from '../protocol/responses'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { PrivacyReport } from './PrivacyReport'
import { IS_LIVE, LIVE, otherModeHref } from '../config/mode'
import { useAccount } from '../live/useAccount'
import { LiveChat } from './live/LiveChat'

const STEPS: StepDef[] = [
  { id: 'prove', label: 'Generating proof...' },
  { id: 'authorize', label: 'Request authorized...' },
  { id: 'route', label: 'Routing privately...' },
  { id: 'done', label: 'Response received.' },
]

const CHAT_SUGGESTIONS = ['Explain Ethereum blobs in simple terms.', 'What does a nullifier do?', 'Summarize EIP-7702.', 'Write a haiku about private payments.']
const DEFAULT_INPUT: Record<string, string> = {
  chat: 'Explain Ethereum blobs in simple terms.',
  search: 'anonymous api credits ethereum',
  image: 'a lighthouse made of zero-knowledge proofs, ink on black',
}
const DEPOSIT_CONTRACT = '0x00000000219ab540356cBB839Cbe05303d7705Fa'

function useTypewriter(text: string, run: boolean) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    if (!run || !text) return
    let i = 0
    const t = setInterval(() => {
      i = Math.min(text.length, i + 3 + Math.floor(Math.random() * 4))
      setN(i)
      if (i >= text.length) clearInterval(t)
    }, 18)
    return () => clearInterval(t)
  }, [text, run])
  return { shown: text.slice(0, n), done: n >= text.length }
}

function decodeRpc(method: RpcMethod, hex: string): string {
  const v = BigInt(hex)
  switch (method) {
    case 'eth_blockNumber':
      return `block ${fmtInt(Number(v))}`
    case 'eth_gasPrice':
      return `${(Number(v) / 1e9).toFixed(3)} gwei`
    case 'eth_chainId':
      return `chain ${v} · Ethereum mainnet`
    case 'eth_getBalance':
      return `${(Number(v / 10n ** 12n) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 4 })} ETH`
  }
}

export function PlaygroundModal({ open, initial }: { open: boolean; initial: ServiceId }) {
  const { state, spend } = useNull()
  const account = useAccount()
  const [liveReq, setLiveReq] = useState<string | null>(null)
  const ui = useUi()
  const { fund } = useActions()
  const [serviceId, setServiceId] = useState<ServiceId>(initial)
  const svc = serviceById(serviceId)
  const [input, setInput] = useState('')
  const [method, setMethod] = useState<RpcMethod>('eth_blockNumber')
  const [address, setAddress] = useState(DEPOSIT_CONTRACT)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [res, setRes] = useState<ServiceResponse | null>(null)
  const [proof, setProof] = useState<AccessProof | null>(null)
  const [error, setError] = useState<string | null>(null)
  const steps = useSteps(STEPS)
  const resultRef = useRef<HTMLDivElement>(null)

  const reset = (id: ServiceId) => {
    setServiceId(id)
    setInput(DEFAULT_INPUT[serviceById(id).kind] ?? '')
    setPhase('idle')
    setRes(null)
    setProof(null)
    setError(null)
    setLiveReq(null)
    steps.reset()
  }

  useEffect(() => {
    if (open) reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const affordable = state.balanceEth >= usdToEth(svc.priceUsd)
  const canSend = phase !== 'running' && (svc.kind === 'rpc' ? method !== 'eth_getBalance' || /^0x[0-9a-fA-F]{40}$/.test(address.trim()) : input.trim().length > 1)

  const send = async () => {
    if (!canSend) return
    if (!affordable) {
      setPhase('error')
      setError(`Your private balance can't cover ${fmtUsd(svc.priceUsd, { micro: true })}. Fund it to continue.`)
      return
    }
    setPhase('running')
    setRes(null)
    setError(null)
    steps.reset()
    const p = await backend.access.authorize({ serviceId: svc.id, maxCostUsd: svc.priceUsd }, steps.onStep)
    setProof(p)
    const r = await backend.router.send(
      { serviceId: svc.id, input: svc.kind === 'rpc' ? method : input.trim(), params: svc.kind === 'rpc' ? { address: address.trim() } : undefined },
      p,
      steps.onStep,
    )
    const detail =
      r.result.kind === 'chat'
        ? `chat · ${r.result.tokens} tokens`
        : r.result.kind === 'rpc'
          ? r.result.method
          : r.result.kind === 'search'
            ? `query · ${r.result.hits.length} results`
            : 'image · 1024×1024'
    spend(svc.id, r.costUsd, p.nullifier, detail)
    setRes(r)
    setPhase('done')
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }

  const chatText = res?.result.kind === 'chat' ? res.result.text : ''
  const tw = useTypewriter(chatText, phase === 'done')

  const tabs = useMemo(() => SERVICES, [])

  return (
    <Modal open={open} onClose={ui.close} locked={phase === 'running'} eyebrow="PRIVATE REQUEST" title="Service playground" width="xl">
      {/* service switcher */}
      <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 [scrollbar-width:none] sm:px-4">
        {tabs.map((s) => {
          const on = s.id === serviceId
          return (
            <button
              key={s.id}
              type="button"
              disabled={phase === 'running'}
              onClick={() => reset(s.id)}
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] transition-colors disabled:opacity-40 ${
                on ? 'text-fg' : 'text-dim hover:text-soft'
              }`}
            >
              {on && <motion.span layoutId="pg-tab" className="absolute inset-0 rounded-md bg-white/[0.06]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <ServiceIcon id={s.id} className="relative size-3.5" />
              <span className="relative">{s.name.toUpperCase()}</span>
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 px-5 py-5 sm:px-6 lg:border-r lg:border-line">
          {/* service header */}
          <div className="flex flex-wrap items-center gap-3">
            <ServiceIconTile id={svc.id} />
            <div className="min-w-0">
              <div className="font-mono text-[13px] tracking-[0.14em] text-fg">{svc.name.toUpperCase()}</div>
              <div className="font-mono text-[11px] text-dim">
                {IS_LIVE && svc.kind === 'chat' ? `${LIVE.models[svc.id]} · metered` : `${svc.route} · ${fmtUsd(svc.priceUsd, { micro: true })} / ${svc.unit.toLowerCase()}`}
              </div>
            </div>
            <div className="ml-auto text-right font-mono text-[11px] text-dim">
              PAID FROM PRIVATE BALANCE
              <div className="text-[12.5px] text-soft">
                <AnimatedNumber value={account.balanceEth} format={(v) => `${fmtEth(v, IS_LIVE ? 6 : 4)} ETH`} flash={false} />
              </div>
            </div>
          </div>

          {IS_LIVE ? (
            <div className="mt-5">
              {svc.kind === 'chat' ? (
                <LiveChat svc={svc} onDone={(id) => setLiveReq(id)} />
              ) : (
                <div className="rounded-md border border-line-2 px-4 py-4">
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    {svc.name} isn&apos;t on the live zkAPI network yet. Today the mainnet deployment routes AI models through OpenRouter; data, RPC and media
                    routes come next.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => reset('claude')}>
                      Use Claude instead
                    </Button>
                    <a href={otherModeHref()} className="inline-flex h-8 items-center rounded-[6px] px-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted hover:text-fg">
                      Try it in demo mode
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
          <>
          {/* input */}
          <div className="mt-5">
            {svc.kind === 'chat' && (
              <>
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
                  {CHAT_SUGGESTIONS.map((s) => (
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
              </>
            )}
            {svc.kind === 'search' && (
              <input
                data-autofocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={phase === 'running'}
                placeholder="Search privately..."
                className="h-12 w-full rounded-md border border-line-2 bg-white/[0.015] px-4 text-[14.5px] text-fg outline-none focus:border-line-3"
              />
            )}
            {svc.kind === 'image' && (
              <textarea
                data-autofocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={phase === 'running'}
                rows={2}
                placeholder="Describe an image..."
                className="block w-full resize-none rounded-md border border-line-2 bg-white/[0.015] px-4 py-3 text-[14.5px] text-fg outline-none focus:border-line-3"
              />
            )}
            {svc.kind === 'rpc' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {RPC_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={phase === 'running'}
                      onClick={() => setMethod(m)}
                      className={`rounded-md border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors ${
                        method === m ? 'border-line-3 bg-white/[0.06] text-fg' : 'border-line text-muted hover:border-line-2 hover:text-soft'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {method === 'eth_getBalance' && (
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    spellCheck={false}
                    className="h-11 w-full rounded-md border border-line-2 bg-white/[0.015] px-3.5 font-mono text-[12.5px] text-fg outline-none focus:border-line-3"
                    aria-label="Address"
                  />
                )}
                <pre className="overflow-x-auto rounded-md border border-line bg-[#08080a] px-4 py-3 font-mono text-[12px] leading-relaxed text-muted">
                  {`{ "jsonrpc": "2.0", "id": 1, "method": "${method}", "params": [${method === 'eth_getBalance' ? `"${address.trim().slice(0, 10)}…", "latest"` : ''}] }`}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={send} disabled={!canSend} loading={phase === 'running'} icon={phase === 'running' ? undefined : <Send className="size-3.5" />}>
              Send private request
            </Button>
            <span className="font-mono text-[11px] text-dim">
              {fmtUsd(svc.priceUsd, { micro: true })} · ≈ {fmtEth(usdToEth(svc.priceUsd), 6)} ETH · no API key
            </span>
          </div>

          {phase === 'error' && error && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-bad/25 bg-bad/[0.05] px-4 py-3">
              <span className="text-[13px] text-bad/90">{error}</span>
              <Button size="sm" variant="secondary" onClick={fund}>
                Fund balance
              </Button>
            </div>
          )}

          {(phase === 'running' || phase === 'done') && (
            <div className="mt-5 rounded-md border border-line bg-[#08080a] px-4 py-2">
              <TerminalSteps defs={STEPS} state={steps.state} />
            </div>
          )}

          {phase === 'done' && res && (
            <motion.div ref={resultRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 overflow-hidden rounded-md border border-line-2">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-white/[0.015] px-4 py-2.5">
                <span className="label !text-[10px] text-muted">RESPONSE · {svc.route}</span>
                <span className="rounded-[3px] border border-line-2 px-1.5 py-px font-mono text-[9.5px] tracking-[0.12em] text-dim">SIMULATED</span>
              </div>
              <div className="px-4 py-4">
                {res.result.kind === 'chat' && (
                  <div className="whitespace-pre-wrap text-[14px] leading-[1.7] text-soft">
                    {tw.shown}
                    {!tw.done && <span className="ml-px inline-block w-[7px] animate-blink text-eth">▍</span>}
                  </div>
                )}
                {res.result.kind === 'rpc' && (
                  <div className="font-mono text-[12.5px]">
                    <pre className="overflow-x-auto leading-relaxed text-soft">{JSON.stringify({ jsonrpc: '2.0', id: 1, result: res.result.result }, null, 2)}</pre>
                    <div className="mt-3 border-t border-line pt-3 text-muted">
                      <span className="text-dim">decoded</span> {decodeRpc(res.result.method as RpcMethod, res.result.result)}
                    </div>
                  </div>
                )}
                {res.result.kind === 'search' && (
                  <ol className="space-y-4">
                    {res.result.hits.map((h, i) => (
                      <motion.li key={h.url} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-dim">
                          {h.url}
                          <ArrowUpRight className="size-3" />
                        </div>
                        <div className="mt-0.5 text-[14px] text-fg">{h.title}</div>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{h.snippet}</p>
                      </motion.li>
                    ))}
                  </ol>
                )}
                {res.result.kind === 'image' && (
                  <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="overflow-hidden rounded-md border border-line">
                      <GenerativeImage seed={res.result.seed} />
                    </motion.div>
                    <div className="font-mono text-[11.5px] leading-relaxed text-dim">
                      <div className="text-muted">&quot;{res.result.prompt}&quot;</div>
                      <div className="mt-2">seed {res.result.seed.toString(16)} · 1024×1024</div>
                      <div className="mt-2">Placeholder render from the demo router. A live route returns the model&apos;s image.</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-4 py-2.5 font-mono text-[10.5px] text-dim">
                <span>
                  REQ <span className="text-muted">{res.requestId}</span>
                </span>
                <span>
                  LATENCY <span className="text-muted">{(res.latencyMs / 1000).toFixed(2)}s</span>
                </span>
                <span>
                  COST <span className="text-muted">{fmtUsd(res.costUsd, { micro: true })}</span>
                </span>
                {proof && (
                  <span className="inline-flex items-center gap-1.5">
                    NULLIFIER <CopyAddress value={proof.nullifier} head={6} tail={4} label="nullifier" className="!text-[10.5px] !text-muted" />
                  </span>
                )}
              </div>
            </motion.div>
          )}
          </>
          )}
        </div>

        <aside className="border-t border-line bg-panel-2/60 lg:sticky lg:top-0 lg:-ml-px lg:self-start lg:border-l lg:border-t-0">
          <PrivacyReport requestId={IS_LIVE ? liveReq ?? undefined : res?.requestId} active={IS_LIVE ? !!liveReq : phase === 'done'} live={IS_LIVE} />
        </aside>
      </div>
    </Modal>
  )
}

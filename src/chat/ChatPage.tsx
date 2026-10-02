import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, ChevronDown, Menu, Plus, Square, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LogoMark } from '../components/Logo'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { StatusDot } from '../components/ui/StatusDot'
import { Tooltip } from '../components/ui/Tooltip'
import { WalletButton } from '../components/WalletButton'
import { IS_LIVE, LIVE } from '../config/mode'
import { ago, fmtEth, fmtUsd } from '../lib/format'
import { useNow } from '../lib/hooks'
import { randHex } from '../lib/random'
import { errorMessage } from '../live/client'
import { useLive } from '../live/LiveProvider'
import { useAccount } from '../live/useAccount'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { sendDemo, sendLive, type WireMessage } from './engine'
import { Markdown } from './Markdown'
import { newConversation, newMessage, titleFrom, useConversations, type Conversation } from './store'

const MODELS = LIVE.chatModels
const DEFAULT_MODEL = MODELS[0].id
const modelLabel = (id: string) => MODELS.find((m) => m.id === id)?.label ?? id
const SUGGESTIONS = [
  'Explain Ethereum blobs in simple terms.',
  'What does a nullifier do?',
  'Summarize EIP-7702 in five bullet points.',
  'Write a haiku about private payments.',
]

// ─── sidebar ─────────────────────────────────────────────────────────────────

function BalanceMini() {
  const account = useAccount()
  const { fund, withdraw } = useActions()
  return (
    <div className="border-t border-line p-4">
      <div className="flex items-center justify-between">
        <span className="label !text-[10px]">PRIVATE BALANCE</span>
        <span className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] ${IS_LIVE ? 'text-ok/90' : 'text-warn/90'}`}>
          <StatusDot tone={IS_LIVE ? 'ok' : 'warn'} live={IS_LIVE} />
          {IS_LIVE ? 'MAINNET' : 'DEMO'}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {account.status === 'loading' ? (
          <span className="flex items-center gap-2 font-mono text-[12px] text-muted">
            <Spinner className="size-3.5" /> connecting…
          </span>
        ) : (
          <>
            <AnimatedNumber value={account.balanceEth} format={(v) => fmtEth(v, IS_LIVE ? 6 : 4)} className="text-[22px] font-medium tracking-[-0.02em] text-fg" />
            <span className="font-mono text-[11px] text-muted">ETH</span>
          </>
        )}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-dim">{account.balanceUsd != null ? `≈ ${fmtUsd(account.balanceUsd, { cents: true })}` : '—'}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={fund} disabled={account.status !== 'ready'}>
          Fund
        </Button>
        <Button size="sm" variant="ghost" onClick={withdraw} disabled={account.status !== 'ready' || !account.hasNote}>
          Withdraw
        </Button>
      </div>
    </div>
  )
}

function Sidebar({
  list,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClear,
}: {
  list: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onClear: () => void
}) {
  const now = useNow(30_000)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <a href="/" className="inline-flex items-center gap-2 text-fg" aria-label="NULL home">
          <LogoMark className="size-5" />
          <span className="font-mono text-[13px] font-semibold tracking-[0.26em]">NULL</span>
          <span className="font-mono text-[11px] tracking-[0.14em] text-dim">CHAT</span>
        </a>
      </div>
      <div className="px-3">
        <Button block variant="secondary" size="sm" onClick={onNew} icon={<Plus className="size-3.5" />}>
          New chat
        </Button>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {list.length === 0 && <p className="px-3 py-6 text-center text-[12.5px] leading-relaxed text-dim">Your chats stay in this browser. Nothing is saved on a server.</p>}
        {list.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-md transition-colors ${c.id === activeId ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
          >
            <button type="button" onClick={() => onSelect(c.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
              <div className={`truncate text-[13px] ${c.id === activeId ? 'text-fg' : 'text-soft'}`}>{c.title}</div>
              <div className="mt-0.5 truncate font-mono text-[10.5px] text-dim">
                {modelLabel(c.model)} · {ago(c.updatedAt, now)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDelete(c.id)}
              aria-label={`Delete chat ${c.title}`}
              className="mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded text-dim opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-bad group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {list.length > 1 && (
          <button type="button" onClick={onClear} className="mt-2 w-full px-3 py-2 text-left font-mono text-[10.5px] tracking-[0.12em] text-faint transition-colors hover:text-muted">
            DELETE ALL CHATS
          </button>
        )}
      </div>
      <BalanceMini />
    </div>
  )
}

// ─── messages ────────────────────────────────────────────────────────────────

function EmptyState({ onPick, disabled }: { onPick: (s: string) => void; disabled: boolean }) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 pt-[12vh] text-center">
      <LogoMark className="size-11 text-fg" />
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.03em] text-fg">Ask privately.</h1>
      <p className="mt-3 max-w-[480px] text-[14.5px] leading-relaxed text-muted">
        Each chat gets its own short-lived key, paid from your private balance with a zero-knowledge proof. Your history stays in this browser.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="rounded-lg border border-line bg-panel/60 px-4 py-3 text-left text-[13.5px] text-soft transition-colors hover:border-line-3 hover:text-fg disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Messages({ conv, phase, streamingId, onRetry }: { conv: Conversation; phase: string; streamingId: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[780px] space-y-7 px-4 py-8 sm:px-6">
      {conv.messages.map((m, i) =>
        m.role === 'user' ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line-2 bg-white/[0.045] px-4 py-2.5 text-[15px] leading-relaxed text-fg">{m.content}</div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-3.5">
            <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-line-2 text-soft">
              <LogoMark className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              {m.content ? <Markdown text={m.content} /> : null}
              {streamingId === m.id && !m.content && (
                <div className="flex items-center gap-2.5 py-1 font-mono text-[12px] text-muted">
                  <Spinner className="size-3.5" />
                  {phase || 'Thinking…'}
                </div>
              )}
              {streamingId === m.id && m.content && <span className="ml-0.5 inline-block w-[7px] animate-blink text-eth">▍</span>}
              {m.error && (
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-bad/25 bg-bad/[0.05] px-3 py-2 text-[13px] text-bad/90">
                  {m.error}
                  {i === conv.messages.length - 1 && (
                    <button type="button" onClick={onRetry} className="font-mono text-[11px] tracking-[0.12em] text-soft underline-offset-2 hover:underline">
                      RETRY
                    </button>
                  )}
                </div>
              )}
              {streamingId !== m.id && !m.error && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-dim">
                  <span>{modelLabel(m.model ?? conv.model)}</span>
                  {m.ms != null && <span>{(m.ms / 1000).toFixed(1)}s</span>}
                  <Tooltip content="Paid from your private balance with a zero-knowledge proof. The provider never saw your wallet.">
                    <span className="text-ok/80">paid by proof ✓</span>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        ),
      )}
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export function ChatPage() {
  const { list, upsert, update, remove, clear } = useConversations()
  const live = useLive()
  const account = useAccount()
  const { spend } = useNull()
  const { fund } = useActions()
  const [activeId, setActiveId] = useState<string>(() => list[0]?.id ?? '')
  const [draft, setDraft] = useState<Conversation>(() => newConversation(DEFAULT_MODEL))
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [settling, setSettling] = useState(false)
  /** conversation whose key is currently open, and the balance when it opened */
  const keyOwner = useRef<{ id: string; startEth: number } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  const conv = useMemo(() => list.find((c) => c.id === activeId) ?? draft, [list, activeId, draft])
  const sending = streamingId !== null
  const canSend = IS_LIVE ? account.status === 'ready' && account.hasNote && account.balanceEth > 0 : true

  useEffect(() => {
    document.title = 'NULL Chat · private AI'
  }, [])

  // keep the newest text in view while streaming
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 260) el.scrollTop = el.scrollHeight
  }, [conv.messages])

  // textarea grows with its content
  useEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(220, el.scrollHeight)}px`
  }, [input])

  /** Settles the open key and books what it cost to the chat that used it. */
  const endSession = useCallback(async () => {
    if (!IS_LIVE || !live) return
    setSettling(true)
    try {
      const client = await live.client()
      await client.settleActiveLease(() => {})
      await live.refresh()
      const owner = keyOwner.current
      const after = (await live.client()).note?.current_balance
      if (owner && after != null) {
        const spent = Math.max(0, owner.startEth - after / 1e9)
        update(owner.id, (c) => ({ ...c, spentEth: c.spentEth + spent }))
        live.addLog({
          kind: 'request',
          actor: 'YOU',
          serviceId: 'claude',
          costUsd: live.ethUsd ? spent * live.ethUsd : 0,
          detail: `chat session · ${fmtEth(spent, 6)} ETH`,
        })
      }
      keyOwner.current = null
    } finally {
      setSettling(false)
    }
  }, [live, update])

  const run = useCallback(
    async (target: Conversation, history: WireMessage[]) => {
      const reply = newMessage('assistant', '', { model: target.model })
      const withReply = { ...target, messages: [...target.messages, reply], updatedAt: Date.now() }
      upsert(withReply)
      setActiveId(withReply.id)
      setStreamingId(reply.id)
      setPhase('')
      const ctrl = new AbortController()
      abort.current = ctrl
      const t0 = performance.now()
      let text = ''
      const patch = (fields: Partial<typeof reply>) =>
        update(withReply.id, (c) => ({ ...c, updatedAt: Date.now(), messages: c.messages.map((m) => (m.id === reply.id ? { ...m, ...fields } : m)) }))
      const hooks = {
        signal: ctrl.signal,
        onPhase: (p: string) => setPhase(p),
        onDelta: (d: string) => {
          text += d
          patch({ content: text })
        },
      }
      try {
        if (IS_LIVE && live) {
          // a different chat still holds the key: settle it first so chats never share one
          if (keyOwner.current && keyOwner.current.id !== withReply.id) await endSession()
          const client = await live.client()
          if (!keyOwner.current) keyOwner.current = { id: withReply.id, startEth: live.balanceEth }
          await sendLive(client, withReply.id, target.model, history, hooks)
        } else {
          await sendDemo(target.model, history, hooks)
          const svc = target.model.includes('gpt') ? 'gpt' : target.model.includes('auto') ? 'openrouter' : 'claude'
          spend(svc, 0.012, randHex(32), `chat · ${modelLabel(target.model)}`)
        }
        patch({ ms: performance.now() - t0 })
      } catch (err) {
        if (ctrl.signal.aborted) patch({ ms: performance.now() - t0 })
        else patch({ error: errorMessage(err) })
      } finally {
        setStreamingId(null)
        setPhase('')
        abort.current = null
      }
    },
    [endSession, live, spend, update, upsert],
  )

  const send = (text: string) => {
    const content = text.trim()
    if (!content || sending || !canSend) return
    const user = newMessage('user', content)
    const base = conv.messages.length ? conv : { ...conv, title: titleFrom(content) }
    const next = { ...base, messages: [...base.messages, user], updatedAt: Date.now() }
    setInput('')
    const history: WireMessage[] = next.messages.filter((m) => !m.error && m.content).map((m) => ({ role: m.role, content: m.content }))
    void run(next, history)
  }

  const retry = () => {
    const msgs = conv.messages
    const last = msgs[msgs.length - 1]
    if (!last || last.role !== 'assistant') return
    const trimmed = { ...conv, messages: msgs.slice(0, -1) }
    const history: WireMessage[] = trimmed.messages.filter((m) => !m.error && m.content).map((m) => ({ role: m.role, content: m.content }))
    void run(trimmed, history)
  }

  const startNew = () => {
    if (sending) return
    setDraft(newConversation(conv.model))
    setActiveId('')
    setDrawer(false)
    setTimeout(() => textarea.current?.focus(), 50)
  }

  const select = (id: string) => {
    if (sending) return
    setActiveId(id)
    setDrawer(false)
  }

  const setModel = (model: string) => {
    if (conv.messages.length) update(conv.id, (c) => ({ ...c, model }))
    else setDraft((d) => ({ ...d, model }))
  }

  const keyOpen = IS_LIVE ? !!live?.pendingRequest || !!keyOwner.current : false

  const sidebar = (
    <Sidebar
      list={list.filter((c) => c.messages.length)}
      activeId={activeId}
      onSelect={select}
      onNew={startNew}
      onDelete={(id) => {
        remove(id)
        if (id === activeId) setActiveId('')
      }}
      onClear={() => {
        clear()
        setActiveId('')
      }}
    />
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg text-fg">
      {/* sidebar, desktop */}
      <aside className="hidden w-[280px] shrink-0 border-r border-line bg-panel/50 md:block">{sidebar}</aside>

      {/* sidebar, mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-hidden />
            <motion.aside
              initial={{ x: -24 }}
              animate={{ x: 0 }}
              exit={{ x: -24 }}
              className="relative h-full w-[84%] max-w-[320px] border-r border-line bg-panel"
            >
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close" className="absolute right-3 top-3.5 z-10 inline-flex size-8 items-center justify-center rounded-md text-dim hover:text-fg">
                <X className="size-4" />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:gap-3 sm:px-5">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open chats" className="inline-flex size-9 items-center justify-center rounded-md border border-line-2 text-soft md:hidden">
            <Menu className="size-4" />
          </button>
          <label className="relative">
            <span className="sr-only">Model</span>
            <select
              value={conv.model}
              onChange={(e) => setModel(e.target.value)}
              disabled={sending}
              className="h-9 appearance-none rounded-md border border-line-2 bg-panel pl-3 pr-8 font-mono text-[11.5px] tracking-[0.04em] text-fg outline-none transition-colors hover:border-line-3 focus:border-line-3 disabled:opacity-50"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-dim" />
          </label>
          {IS_LIVE && (
            <Tooltip content="Each chat uses its own short-lived key with a $1 cap. Ending the session settles the real usage against your private balance.">
              <span
                className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] sm:inline-flex ${
                  keyOpen ? 'border-ok/30 text-ok/90' : 'border-line-2 text-dim'
                }`}
              >
                <StatusDot tone={keyOpen ? 'ok' : 'dim'} live={keyOpen} />
                {keyOpen ? 'PRIVATE KEY ACTIVE' : 'NO OPEN KEY'}
              </span>
            </Tooltip>
          )}
          {IS_LIVE && keyOpen && !sending && (
            <Button size="sm" variant="ghost" onClick={() => void endSession()} loading={settling} className="hidden sm:inline-flex">
              End & settle
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <a href={IS_LIVE ? '/chat?demo' : '/chat'} className={`hidden rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] sm:inline-flex ${IS_LIVE ? 'border-ok/30 text-ok/90' : 'border-warn/30 text-warn/90'}`}>
              {IS_LIVE ? 'LIVE' : 'DEMO'}
            </a>
            <WalletButton />
          </div>
        </div>

        {/* conversation */}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {conv.messages.length === 0 ? <EmptyState onPick={send} disabled={!canSend} /> : <Messages conv={conv} phase={phase} streamingId={streamingId} onRetry={retry} />}
          {conv.spentEth > 0 && (
            <p className="mx-auto max-w-[780px] px-6 pb-4 font-mono text-[10.5px] text-dim">
              this chat has cost {fmtEth(conv.spentEth, 6)} ETH{live?.ethUsd ? ` (${fmtUsd(conv.spentEth * live.ethUsd, { micro: true })})` : ''} so far
            </p>
          )}
        </div>

        {/* composer */}
        <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6">
          <div className="mx-auto max-w-[780px]">
            {IS_LIVE && account.status === 'ready' && !account.hasNote && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-2 bg-panel/70 px-4 py-3">
                <span className="text-[13.5px] text-muted">Fund a private balance on Ethereum mainnet to start chatting.</span>
                <Button size="sm" variant="primary" onClick={fund}>
                  Fund
                </Button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-line-2 bg-panel px-3 py-2.5 transition-colors focus-within:border-line-3">
              <textarea
                ref={textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                rows={1}
                disabled={!canSend}
                placeholder={canSend ? 'Ask privately…' : IS_LIVE && account.status !== 'ready' ? 'Connecting to zkAPI…' : 'Fund a private balance to start'}
                className="max-h-[220px] min-h-[26px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-fg outline-none placeholder:text-dim disabled:opacity-60"
              />
              {sending ? (
                <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-2 text-soft hover:text-fg">
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || !canSend}
                  aria-label="Send"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-fg text-bg transition-opacity disabled:opacity-25"
                >
                  <ArrowUp className="size-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
            <p className="mt-2 text-center font-mono text-[10px] leading-relaxed tracking-[0.04em] text-dim">
              <span className="text-ok/80">payment identity hidden</span> · the model provider reads your prompt · your IP is visible to OpenRouter (use Tor or a VPN)
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

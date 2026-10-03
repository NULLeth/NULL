import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, ChevronDown, Download, ExternalLink, Globe, ImageIcon, Menu, Plus, Square, Trash2, X } from 'lucide-react'
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
import { randHex, randId } from '../lib/random'
import { errorMessage } from '../live/client'
import type { Source } from '../live/stream'
import { useConnection } from '../live/connection'
import { useLive } from '../live/LiveProvider'
import { useAccount } from '../live/useAccount'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { sendDemo, sendImageDemo, sendImageLive, sendLive, type GeneratedImage, type WireMessage } from './engine'
import { deleteImages, getImageDataUrl, putImage, useImageUrl } from './images'
import { Markdown } from './Markdown'
import { newConversation, newMessage, titleFrom, useConversations, type ChatMessage, type Conversation } from './store'

const MODELS = LIVE.chatModels
const DEFAULT_MODEL = MODELS[0].id
const IMAGE_MODELS = LIVE.imageModels
const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].id
const imageModelOf = (c: Conversation) => IMAGE_MODELS.find((m) => m.id === c.imageModel) ?? IMAGE_MODELS[0]
const modelLabel = (id: string) => MODELS.find((m) => m.id === id)?.label ?? IMAGE_MODELS.find((m) => m.id === id)?.label ?? id
const ASPECTS = ['1:1', '16:9', '9:16'] as const
/** vendors in list order, for the grouped model picker */
const VENDORS = [...new Set(MODELS.map((m) => m.vendor))]
const SUGGESTIONS = [
  'Explain Ethereum blobs in simple terms.',
  'What does a nullifier do?',
  'Summarize EIP-7702 in five bullet points.',
  'Write a haiku about private payments.',
]
const WEB_SUGGESTIONS = [
  'What happened on Ethereum this week?',
  'Latest news about zkAPI and private payments.',
  'What are ETH gas fees like right now?',
  'Top AI headlines today, with sources.',
]

const IMAGE_SUGGESTIONS = [
  'A glass lighthouse on a cliff at night, cinematic',
  'A tiny robot reading a book under a tree, watercolor',
  'Retro 1970s poster that says "Privacy is normal"',
  'The Ethereum logo carved from ice, studio lighting',
]

/** `/chat?web=1` / `/chat?image=1` open a new chat with web search or image mode already on. */
const WEB_FROM_URL = new URLSearchParams(window.location.search).get('web') === '1'
const IMAGE_FROM_URL = new URLSearchParams(window.location.search).get('image') === '1'

const mimeOf = (dataUrl: string) => dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/png'
const extOf = (mime: string) => (mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] || 'png')
const imageIds = (c: Conversation) => c.messages.flatMap((m) => m.images?.map((i) => i.id) ?? [])
/** the image a new prompt in this chat would edit: the answer right before it */
const editTarget = (messages: ChatMessage[]) => {
  const prev = messages[messages.length - 1]
  return prev?.role === 'assistant' && !prev.error ? prev.images?.[0] : undefined
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Adds citations we haven't seen yet (streams can repeat them). */
const mergeSources = (have: Source[], add: Source[]) => {
  const seen = new Set(have.map((s) => s.url))
  return [...have, ...add.filter((s) => !seen.has(s.url) && seen.add(s.url))]
}

const daysLeft = (expiryTs: number | null) => (expiryTs ? Math.max(0, Math.ceil((expiryTs * 1000 - Date.now()) / 86_400_000)) : null)
const expiryDate = (expiryTs: number) => new Date(expiryTs * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

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
      {IS_LIVE && account.hasNote && account.expiryTs != null && (
        <Tooltip content="Private balances expire 30 days after funding. Withdraw before then: after that the operator can claim what's left.">
          <div className={`mt-1 font-mono text-[10.5px] ${(daysLeft(account.expiryTs) ?? 99) <= 7 ? 'text-warn' : 'text-dim'}`}>
            expires {expiryDate(account.expiryTs)} · {daysLeft(account.expiryTs)} days left
          </div>
        </Tooltip>
      )}
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
                {modelLabel(c.image ? (c.imageModel ?? DEFAULT_IMAGE_MODEL) : c.model)} · {ago(c.updatedAt, now)}
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

/** A deposit landed on-chain but this browser never finished confirming it. */
function RecoverDeposit({ amountEth }: { amountEth: number }) {
  const live = useLive()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const run = async () => {
    if (!live) return
    setBusy(true)
    setErr('')
    try {
      await live.recoverDeposit(setMsg)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mb-3 rounded-lg border border-warn/30 bg-warn/[0.05] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13.5px] text-soft">A deposit of {fmtEth(amountEth, 4)} ETH from this browser isn&apos;t confirmed yet.</span>
        <Button size="sm" variant="primary" onClick={() => void run()} loading={busy}>
          Recover deposit
        </Button>
      </div>
      {(msg || err) && <p className={`mt-2 font-mono text-[11px] leading-relaxed ${err ? 'text-bad/90' : 'text-muted'}`}>{err || msg}</p>}
    </div>
  )
}

/** The line under the composer: what stays hidden, what doesn't, and the Tor status. */
function PrivacyLine({ web, image }: { web: boolean; image: boolean }) {
  const c = useConnection()
  const { open } = useUi()
  const tor = c.status === 'done' && c.tor
  return (
    <p className="mt-2 text-center font-mono text-[10px] leading-relaxed tracking-[0.04em] text-dim">
      <span className="text-ok/80">payment identity hidden</span> · the model provider reads your prompt
      {web ? ' · search queries go to the search provider via OpenRouter' : ''}
      {image ? ' · images are saved only in this browser' : ''} ·{' '}
      {tor ? (
        <button type="button" onClick={() => open({ name: 'tor' })} className="text-ok/90 underline-offset-2 hover:underline">
          Tor ✓ your IP is hidden too
        </button>
      ) : (
        <>
          your IP is visible to OpenRouter ·{' '}
          <button type="button" onClick={() => open({ name: 'tor' })} className="text-soft underline decoration-line-3 underline-offset-2 hover:text-fg">
            hide it with Tor
          </button>
        </>
      )}
    </p>
  )
}

/** Shown when the private balance is close to expiring. */
function ExpiryWarning({ expiryTs }: { expiryTs: number }) {
  const { withdraw } = useActions()
  const left = daysLeft(expiryTs) ?? 0
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn/30 bg-warn/[0.05] px-4 py-3">
      <span className="text-[13px] leading-relaxed text-soft">
        Your private balance expires on <span className="text-fg">{expiryDate(expiryTs)}</span> ({left === 0 ? 'today' : `${left} day${left === 1 ? '' : 's'}`}).
        Withdraw before then: after that the operator can claim what&apos;s left.
      </span>
      <Button size="sm" variant="secondary" onClick={withdraw}>
        Withdraw
      </Button>
    </div>
  )
}

// ─── messages ────────────────────────────────────────────────────────────────

function EmptyState({ onPick, disabled, web, image }: { onPick: (s: string) => void; disabled: boolean; web: boolean; image: boolean }) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 pt-[12vh] text-center">
      <LogoMark className="size-11 text-fg" />
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.03em] text-fg">{image ? 'Imagine privately.' : web ? 'Search privately.' : 'Ask privately.'}</h1>
      <p className="mt-3 max-w-[480px] text-[14.5px] leading-relaxed text-muted">
        {image
          ? 'Image mode is on: describe a picture and it appears here. Reply to edit it. Images are saved only in this browser.'
          : web
            ? 'Web search is on: answers use live results and list their sources. Paid from your private balance like every request.'
            : 'Each chat gets its own short-lived key, paid from your private balance with a zero-knowledge proof. Your history stays in this browser.'}
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {(image ? IMAGE_SUGGESTIONS : web ? WEB_SUGGESTIONS : SUGGESTIONS).map((s) => (
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
      <p className="mt-6 font-mono text-[10.5px] tracking-[0.06em] text-dim">
        {image
          ? `${IMAGE_MODELS.length} image models · Nano Banana 2 by default · about ${Math.round(IMAGE_MODELS[0].approxUsd * 100)}¢ per image`
          : `${MODELS.length - 1} models · Claude, GPT, Gemini, Grok, DeepSeek, Kimi, Llama and more · switch any time at the top`}
      </p>
    </div>
  )
}

function Sources({ list }: { list: Source[] }) {
  return (
    <div className="mt-4">
      <div className="mb-2 font-mono text-[10px] tracking-[0.14em] text-dim">SOURCES</div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {list.map((s, i) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            title={s.title}
            className="flex min-w-0 items-start gap-2.5 rounded-md border border-line-2 bg-panel/60 px-3 py-2 transition-colors hover:border-line-3"
          >
            <span className="mt-px font-mono text-[10.5px] text-dim">{i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] text-soft">{s.title}</span>
              <span className="block truncate font-mono text-[10.5px] text-dim">{host(s.url)}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

const ASPECT_WIDTH: Record<string, string> = { '1:1': 'max-w-[420px]', '16:9': 'max-w-[560px]', '9:16': 'max-w-[300px]' }

function ChatImage({ id, aspect, mime }: { id: string; aspect: string; mime: string }) {
  const url = useImageUrl(id)
  return (
    <div className={`w-full ${ASPECT_WIDTH[aspect] ?? ASPECT_WIDTH['1:1']}`}>
      <div className="overflow-hidden rounded-xl border border-line-2 bg-panel" style={{ aspectRatio: aspect.replace(':', ' / ') }}>
        {url ? (
          <img src={url} alt="Generated image" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-[11px] text-dim">{url === null ? 'image not found in this browser' : 'loading…'}</div>
        )}
      </div>
      {url && (
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={url}
            download={`NULL-image-${id}.${extOf(mime)}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 px-2.5 font-mono text-[10.5px] tracking-[0.1em] text-soft transition-colors hover:border-line-3 hover:text-fg"
          >
            <Download className="size-3" />
            DOWNLOAD
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 px-2.5 font-mono text-[10.5px] tracking-[0.1em] text-soft transition-colors hover:border-line-3 hover:text-fg"
          >
            <ExternalLink className="size-3" />
            OPEN
          </a>
        </div>
      )}
    </div>
  )
}

function ImagePending({ aspect, phase }: { aspect: string; phase: string }) {
  return (
    <div className={`w-full ${ASPECT_WIDTH[aspect] ?? ASPECT_WIDTH['1:1']}`}>
      <div className="relative overflow-hidden rounded-xl border border-line-2 bg-panel" style={{ aspectRatio: aspect.replace(':', ' / ') }}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-eth/[0.07] via-transparent to-white/[0.03]" />
        <div className="absolute inset-0 flex items-center justify-center gap-2.5 px-4 text-center font-mono text-[12px] text-muted">
          <Spinner className="size-3.5" />
          {phase || 'Painting…'}
        </div>
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
              {m.image && streamingId === m.id && <ImagePending aspect={conv.aspect ?? '1:1'} phase={phase} />}
              {m.images?.map((img) => <ChatImage key={img.id} id={img.id} aspect={img.aspect} mime={img.mime} />)}
              {!m.image && streamingId === m.id && !m.content && (
                <div className="flex items-center gap-2.5 py-1 font-mono text-[12px] text-muted">
                  <Spinner className="size-3.5" />
                  {phase || 'Thinking…'}
                </div>
              )}
              {streamingId === m.id && m.content && <span className="ml-0.5 inline-block w-[7px] animate-blink text-eth">▍</span>}
              {!!m.sources?.length && <Sources list={m.sources} />}
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
                  {m.web && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="size-3" />
                      web
                    </span>
                  )}
                  {m.image && (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-3" />
                      image
                    </span>
                  )}
                  {m.ms != null && <span>{(m.ms / 1000).toFixed(1)}s</span>}
                  {m.costUsd != null && <span>{fmtUsd(m.costUsd, { cents: true })}</span>}
                  <Tooltip content="Paid from your private balance with a zero-knowledge proof. The provider never saw your wallet.">
                    <span className="text-ok/80">paid by proof ✓</span>
                  </Tooltip>
                  {!!m.images?.length && i === conv.messages.length - 1 && <span className="text-faint">reply to edit this image</span>}
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
  const ui = useUi()
  const conn = useConnection()
  const [activeId, setActiveId] = useState<string>(() => (WEB_FROM_URL || IMAGE_FROM_URL ? '' : (list[0]?.id ?? '')))
  const [draft, setDraft] = useState<Conversation>(() => ({
    ...newConversation(DEFAULT_MODEL),
    web: WEB_FROM_URL && !IMAGE_FROM_URL,
    image: IMAGE_FROM_URL,
  }))
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

  // textarea grows with its content (and refits when its width changes, e.g. first layout)
  useEffect(() => {
    const el = textarea.current
    if (!el) return
    const fit = () => {
      el.style.height = '0px'
      el.style.height = `${Math.min(220, el.scrollHeight)}px`
    }
    fit()
    let width = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit()
    })
    ro.observe(el)
    return () => ro.disconnect()
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
      const imageModel = target.imageModel ?? DEFAULT_IMAGE_MODEL
      const reply = newMessage('assistant', '', {
        model: target.image ? imageModel : target.model,
        ...(target.image ? { image: true } : target.web ? { web: true } : {}),
      })
      const withReply = { ...target, messages: [...target.messages, reply], updatedAt: Date.now() }
      upsert(withReply)
      setActiveId(withReply.id)
      setStreamingId(reply.id)
      setPhase('')
      const ctrl = new AbortController()
      abort.current = ctrl
      const t0 = performance.now()
      let text = ''
      let sources: Source[] = []
      const patch = (fields: Partial<ChatMessage>) =>
        update(withReply.id, (c) => ({ ...c, updatedAt: Date.now(), messages: c.messages.map((m) => (m.id === reply.id ? { ...m, ...fields } : m)) }))
      const hooks = {
        signal: ctrl.signal,
        onPhase: (p: string) => setPhase(p),
        onDelta: (d: string) => {
          text += d
          patch({ content: text })
        },
        web: !!target.web,
        onSources: (s: Source[]) => {
          const next = mergeSources(sources, s)
          if (next.length === sources.length) return
          sources = next
          patch({ sources })
        },
      }
      try {
        if (target.image) {
          const prompt = [...target.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
          const prior = editTarget(target.messages.slice(0, -1))
          const req = { prompt, aspect: target.aspect ?? '1:1', reference: prior ? await getImageDataUrl(prior.id) : null }
          let img: GeneratedImage
          if (IS_LIVE && live) {
            if (keyOwner.current && keyOwner.current.id !== withReply.id) await endSession()
            const client = await live.client()
            if (!keyOwner.current) keyOwner.current = { id: withReply.id, startEth: live.balanceEth }
            img = await sendImageLive(client, withReply.id, imageModel, req, hooks)
          } else {
            img = await sendImageDemo(req, hooks)
            spend('image-gen', img.costUsd ?? 0.04, randHex(32), `image · ${modelLabel(imageModel)}`)
          }
          const id = randId('img', 12)
          await putImage(id, img.dataUrl)
          patch({ images: [{ id, aspect: req.aspect, mime: mimeOf(img.dataUrl) }], costUsd: img.costUsd, ms: performance.now() - t0 })
          return
        }
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
          if (target.web) spend('web-search', 0.0021, randHex(32), `web search · ${sources.length} sources`)
        }
        patch({ ms: performance.now() - t0 })
      } catch (err) {
        if (ctrl.signal.aborted) patch(target.image ? { error: 'Stopped before the image was ready.' } : { ms: performance.now() - t0 })
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
    setDraft({ ...newConversation(conv.model), web: !!conv.web, image: !!conv.image, imageModel: conv.imageModel, aspect: conv.aspect })
    setActiveId('')
    setDrawer(false)
    setTimeout(() => textarea.current?.focus(), 50)
  }

  const select = (id: string) => {
    if (sending) return
    setActiveId(id)
    setDrawer(false)
  }

  /** changes this chat's settings (stored once it has messages, else on the draft) */
  const setConv = (fields: Partial<Conversation>) => {
    if (conv.messages.length) update(conv.id, (c) => ({ ...c, ...fields }))
    else setDraft((d) => ({ ...d, ...fields }))
  }

  const setModel = (model: string) => setConv(conv.image ? { imageModel: model } : { model })

  const toggleWeb = () => {
    setConv({ web: !conv.web, image: false })
    textarea.current?.focus()
  }

  const toggleImage = () => {
    setConv({ image: !conv.image, web: false })
    textarea.current?.focus()
  }

  const editing = conv.image && !!editTarget(conv.messages)

  const keyOpen = IS_LIVE ? !!live?.pendingRequest || !!keyOwner.current : false

  const sidebar = (
    <Sidebar
      list={list.filter((c) => c.messages.length)}
      activeId={activeId}
      onSelect={select}
      onNew={startNew}
      onDelete={(id) => {
        const gone = list.find((c) => c.id === id)
        if (gone) void deleteImages(imageIds(gone))
        remove(id)
        if (id === activeId) setActiveId('')
      }}
      onClear={() => {
        void deleteImages(list.flatMap(imageIds))
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
              value={conv.image ? imageModelOf(conv).id : conv.model}
              onChange={(e) => setModel(e.target.value)}
              disabled={sending}
              className="h-9 appearance-none rounded-md border border-line-2 bg-panel pl-3 pr-8 font-mono text-[11.5px] tracking-[0.04em] text-fg outline-none transition-colors hover:border-line-3 focus:border-line-3 disabled:opacity-50"
            >
              {conv.image ? (
                <optgroup label="Image models">
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                VENDORS.map((v) => (
                  <optgroup key={v} label={v}>
                    {MODELS.filter((m) => m.vendor === v).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
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
          {conn.status === 'done' && conn.tor && (
            <Tooltip content="You're connected through Tor: OpenRouter and NULL see a Tor exit, not your IP.">
              <button
                type="button"
                onClick={() => ui.open({ name: 'tor' })}
                className="hidden items-center gap-1.5 rounded-full border border-ok/30 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-ok/90 sm:inline-flex"
              >
                <StatusDot tone="ok" live />
                TOR
              </button>
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
          {conv.messages.length === 0 ? <EmptyState onPick={send} disabled={!canSend} web={!!conv.web} image={!!conv.image} /> : <Messages conv={conv} phase={phase} streamingId={streamingId} onRetry={retry} />}
          {conv.spentEth > 0 && (
            <p className="mx-auto max-w-[780px] px-6 pb-4 font-mono text-[10.5px] text-dim">
              this chat has cost {fmtEth(conv.spentEth, 6)} ETH{live?.ethUsd ? ` (${fmtUsd(conv.spentEth * live.ethUsd, { micro: true })})` : ''} so far
            </p>
          )}
        </div>

        {/* composer */}
        <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6">
          <div className="mx-auto max-w-[780px]">
            {IS_LIVE && account.status === 'error' && (
              <div className="mb-3 rounded-lg border border-bad/25 bg-bad/[0.05] px-4 py-3 text-[13px] leading-relaxed text-bad/90">
                zkAPI could not start: {account.error}
              </div>
            )}
            {IS_LIVE && account.hasNote && account.expiryTs != null && (daysLeft(account.expiryTs) ?? 99) <= 7 && <ExpiryWarning expiryTs={account.expiryTs} />}
            {IS_LIVE && account.status === 'ready' && !account.hasNote && live?.pendingDepositEth != null && <RecoverDeposit amountEth={live.pendingDepositEth} />}
            {IS_LIVE && account.status === 'ready' && !account.hasNote && live?.pendingDepositEth == null && (
              <div className="mb-3 rounded-lg border border-line-2 bg-panel/70 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13.5px] text-muted">Fund a private balance on Ethereum mainnet to start chatting.</span>
                  <Button size="sm" variant="primary" onClick={fund}>
                    Fund
                  </Button>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-dim">
                  Funded before? A private balance lives in the browser and on the exact site address you funded it on ({window.location.host} here). Open that
                  address in that browser to see it.
                </p>
              </div>
            )}
            {conv.image && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-dim">
                <span className="mr-1 tracking-[0.12em]">FORMAT</span>
                {ASPECTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setConv({ aspect: a })}
                    disabled={sending}
                    aria-pressed={(conv.aspect ?? '1:1') === a}
                    className={`h-6 rounded-md border px-2 transition-colors disabled:opacity-50 ${
                      (conv.aspect ?? '1:1') === a ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                    }`}
                  >
                    {a}
                  </button>
                ))}
                <span className="ml-auto">
                  ≈ {Math.round(imageModelOf(conv).approxUsd * 100)}¢ per image · {editing ? 'your next message edits the last image' : 'describe a picture'}
                </span>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-line-2 bg-panel px-3 py-2.5 transition-colors focus-within:border-line-3">
              <Tooltip content={conv.web ? 'Web search is on: answers use live results and list sources. Adds a small search fee per message.' : 'Turn on web search for live results with sources.'}>
                <button
                  type="button"
                  onClick={toggleWeb}
                  disabled={sending}
                  aria-pressed={!!conv.web}
                  aria-label="Web search"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.web ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <Globe className="size-3.5" />
                  <span className="hidden sm:inline">WEB</span>
                </button>
              </Tooltip>
              <Tooltip content={conv.image ? 'Image mode is on: each message makes or edits a picture. Images stay in this browser.' : 'Turn on image mode to create pictures privately.'}>
                <button
                  type="button"
                  onClick={toggleImage}
                  disabled={sending}
                  aria-pressed={!!conv.image}
                  aria-label="Image mode"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.image ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <ImageIcon className="size-3.5" />
                  <span className="hidden sm:inline">IMAGE</span>
                </button>
              </Tooltip>
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
                placeholder={
                  canSend
                    ? conv.image
                      ? editing
                        ? 'Describe a change, e.g. "make it night"…'
                        : 'Describe an image…'
                      : conv.web
                        ? 'Search the web privately…'
                        : 'Ask privately…'
                    : IS_LIVE && account.status === 'loading'
                      ? 'Connecting to zkAPI…'
                      : IS_LIVE && account.status === 'error'
                        ? 'zkAPI is unavailable'
                        : 'Fund a private balance to start'
                }
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
            <PrivacyLine web={!!conv.web} image={!!conv.image} />
          </div>
        </div>
      </main>
    </div>
  )
}

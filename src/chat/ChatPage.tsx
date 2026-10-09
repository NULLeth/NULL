import { AnimatePresence, motion } from 'framer-motion'
import type { ZkClient } from '@openanonymity/zkapi-browser-sdk'
import { ArrowUp, ChevronDown, Columns2, Download, ExternalLink, FileText, Globe, ImageIcon, Menu, Mic, Paperclip, Plus, ScanFace, ScanText, ShieldCheck, Square, Trash2, X } from 'lucide-react'
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
import { sendDemo, sendImageDemo, sendImageLive, sendLive, type GeneratedImage, type SendHooks, type WireMessage } from './engine'
import { ACCEPT, fileKind, MAX_FILES, photoUrl, readFile, type DocFile, type ReadFile } from './files'
import { deleteImages, getImageDataUrl, getText, putImage, putText, useImageUrl } from './images'
import { Markdown } from './Markdown'
import { VoiceButton } from './VoiceButton'
import { AI_MODEL_MB, detectAi, loadAiShield, mergeHits } from './aiShield'
import { detect, KIND_LABEL, restore, shield, type ShieldHit } from './shield'
import { newConversation, newMessage, titleFrom, useConversations, type AltAnswer, type ChatFile, type ChatMessage, type Conversation } from './store'

const MODELS = LIVE.chatModels
const DEFAULT_MODEL = MODELS[0].id
const IMAGE_MODELS = LIVE.imageModels
const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].id
const imageModelOf = (c: Conversation) => IMAGE_MODELS.find((m) => m.id === c.imageModel) ?? IMAGE_MODELS[0]
const modelLabel = (id: string) => MODELS.find((m) => m.id === id)?.label ?? IMAGE_MODELS.find((m) => m.id === id)?.label ?? id
const ASPECTS = ['1:1', '16:9', '9:16'] as const
/** compare mode's default second model: Grok, or Claude when Grok is already the first */
const secondModel = (first: string) => (first.startsWith('x-ai/') ? DEFAULT_MODEL : 'x-ai/grok-4.7')
/** 0.0031 → "0.31¢", 0.067 → "$0.067" */
const fmtCost = (usd: number) => (usd < 0.01 ? `${(usd * 100).toFixed(usd < 0.001 ? 3 : 2)}¢` : `$${usd.toFixed(usd < 1 ? 3 : 2)}`)
const COST_TIP = 'What this answer cost, as reported by OpenRouter. Paid from your private balance.'
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

/** Prompt Shield settings live in this browser: on by default, plus words to always hide. */
const SHIELD_KEY = 'null.shield.v1'
/** ai: the in-browser AI Shield model (opt-in, it downloads ~29 MB once) */
function loadShield(): { on: boolean; words: string[]; ai: boolean } {
  try {
    const j = JSON.parse(localStorage.getItem(SHIELD_KEY) ?? 'null') as { on?: unknown; words?: unknown; ai?: unknown } | null
    if (j && typeof j.on === 'boolean' && Array.isArray(j.words))
      return { on: j.on, words: j.words.filter((w): w is string => typeof w === 'string'), ai: j.ai === true }
  } catch {
    /* fall through */
  }
  return { on: true, words: [], ai: false }
}

type AiStatus = { status: 'off' | 'loading' | 'ready' | 'error'; progress: number }

/**
 * What goes to the model: the shielded text where there is one, attached documents as text
 * blocks (shielded too), photos as images for models that can see. In compare mode each
 * model gets its own thread: side 'b' sees the second model's earlier answers.
 */
async function toWire(msgs: ChatMessage[], side: 'a' | 'b', vision: boolean): Promise<WireMessage[]> {
  const out: WireMessage[] = []
  for (const m of msgs) {
    const src: ChatMessage | AltAnswer = side === 'b' && m.role === 'assistant' && m.alt ? m.alt : m
    const text = src.wire ?? src.content
    if (src.error || (!text && !m.files?.length)) continue
    if (m.role !== 'user' || !m.files?.length) {
      out.push({ role: m.role, content: text })
      continue
    }
    const docs = await Promise.all(
      m.files
        .filter((f) => f.kind === 'doc')
        .map(async (f) => (await getText(`${f.id}.wire`)) ?? (await getText(f.id)) ?? `<document name="${docName(f.name)}">\n(no longer stored in this browser)\n</document>`),
    )
    const body = [...docs, text].filter(Boolean).join('\n\n')
    const photos = m.files.filter((f) => f.kind === 'photo')
    if (!photos.length) out.push({ role: 'user', content: body })
    else if (!vision) out.push({ role: 'user', content: `${body}\n\n(${photos.length} photo${photos.length === 1 ? '' : 's'} left out: this model reads text only)`.trim() })
    else {
      const urls = (await Promise.all(photos.map((f) => getImageDataUrl(f.id)))).filter((u): u is string => !!u)
      out.push({ role: 'user', content: [{ type: 'text', text: body || 'Here is a photo.' }, ...urls.map((url) => ({ type: 'image_url' as const, image_url: { url } }))] })
    }
  }
  return out
}

const canSee = (model: string) => !LIVE.textOnlyModels.includes(model)
/** file names go to the model inside the document tag, so they are shielded too ("Jonas_Weber_CV" → words) */
const docName = (name: string) => name.replace(/[_]+/g, ' ').replace(/"/g, "'")
const docBlock = (f: DocFile) => `<document name="${docName(f.name)}"${f.pages ? ` pages="${f.pages}"` : ''}>\n${f.text}\n</document>`
/** rough token count of a text (about 4 characters per token) */
const fmtTokens = (chars: number) => {
  const t = Math.max(1, Math.round(chars / 4))
  return t < 1000 ? `~${t} tokens` : `~${(t / 1000).toFixed(t < 10_000 ? 1 : 0)}k tokens`
}
const fmtChars = (n: number) => (n < 1000 ? `${n} chars` : `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k chars`)

/** A file being attached to the next message. */
interface Attachment {
  key: string
  name: string
  kind: 'doc' | 'photo'
  status: 'reading' | 'ready' | 'error'
  file?: ReadFile
  error?: string
  /** Face Shield: send this photo with its faces blurred (default) */
  blur?: boolean
  /** Screenshot Shield: send it with personal details in its text covered (default with Prompt Shield on) */
  cover?: boolean
}

const mimeOf = (dataUrl: string) => dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/png'
const extOf = (mime: string) => (mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] || 'png')
const imageIds = (c: Conversation) => c.messages.flatMap((m) => [...(m.images?.map((i) => i.id) ?? []), ...(m.files?.map((f) => f.id) ?? [])])
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
                {c.image ? modelLabel(c.imageModel ?? DEFAULT_IMAGE_MODEL) : c.compare ? `${modelLabel(c.model)} vs ${modelLabel(c.model2 ?? secondModel(c.model))}` : modelLabel(c.model)} ·{' '}
                {ago(c.updatedAt, now)}
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
function PrivacyLine({ web, image, shieldOn }: { web: boolean; image: boolean; shieldOn: boolean }) {
  const c = useConnection()
  const { open } = useUi()
  const tor = c.status === 'done' && c.tor
  return (
    <p className="mt-2 text-center font-mono text-[10px] leading-relaxed tracking-[0.04em] text-dim">
      <span className="text-ok/80">payment identity hidden</span> ·{' '}
      {shieldOn ? (
        <>
          <span className="text-ok/80">personal details shielded</span>, the model reads the rest
        </>
      ) : (
        'the model provider reads your prompt'
      )}
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

/** Above the composer: what the shield will hide in the message being typed. */
function ShieldBar({
  hits,
  skip,
  onToggle,
  words,
  onWords,
  ai,
  aiWanted,
  aiKeys,
  onAi,
  files,
}: {
  files: { name: string; count: number }[]
  hits: ShieldHit[]
  skip: Set<string>
  onToggle: (value: string) => void
  words: string[]
  onWords: (w: string[]) => void
  ai: AiStatus
  aiWanted: boolean
  aiKeys: Set<string>
  onAi: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [word, setWord] = useState('')
  const inFiles = files.reduce((n, f) => n + f.count, 0)
  const hidden = hits.filter((h) => !skip.has(h.value)).length + inFiles
  const total = hits.length + inFiles
  const add = () => {
    const w = word.trim()
    if (w.length >= 2 && !words.includes(w)) onWords([...words, w])
    setWord('')
  }
  return (
    <div className="mb-2 font-mono text-[10.5px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 tracking-[0.12em] text-ok/90">
          <ShieldCheck className="size-3.5" />
          SHIELD
        </span>
        <span className="text-dim">{total ? `${hidden} of ${total} hidden from the AI` : 'nothing personal found'}</span>
        {files.map((f, i) => (
          <span
            key={`${f.name}-${i}`}
            title="Details in this file are swapped for placeholders before it is sent."
            className={`inline-flex h-6 max-w-[240px] items-center gap-1 rounded-md border px-2 ${f.count ? 'border-ok/30 bg-ok/[0.06] text-ok/90' : 'border-line-2 text-dim'}`}
          >
            <FileText className="size-3 shrink-0" />
            <span className="truncate">{f.name}</span>
            <span className="shrink-0 whitespace-nowrap">· {f.count ? `${f.count} hidden` : 'nothing found'}</span>
          </span>
        ))}
        {hits.map((h) => {
          const off = skip.has(h.value)
          return (
            <button
              key={h.start}
              type="button"
              onClick={() => onToggle(h.value)}
              title={off ? 'Will be sent as written. Click to hide it.' : 'Hidden from the AI. Click to send it as written.'}
              className={`h-6 max-w-[240px] truncate rounded-md border px-2 transition-colors ${
                off ? 'border-line-2 text-dim line-through' : 'border-ok/30 bg-ok/[0.06] text-ok/90 hover:border-ok/50'
              }`}
            >
              {aiKeys.has(`${h.start}:${h.end}`) && <span className="text-eth">AI · </span>}
              {KIND_LABEL[h.kind]} · {h.value}
            </button>
          )
        })}
        <Tooltip
          content={
            aiWanted
              ? 'AI Shield: a small model in your browser also finds people, places and companies. Nothing is sent anywhere to do this. Click to turn it off.'
              : `Turn on AI Shield: a ${AI_MODEL_MB} MB model downloads once from nullzk.com and runs in your browser. It finds people, places and companies the patterns miss. English works best.`
          }
        >
          <button
            type="button"
            onClick={onAi}
            className={`ml-auto h-6 rounded-md border px-2 transition-colors ${
              aiWanted && ai.status === 'ready'
                ? 'border-eth/40 bg-eth/10 text-eth'
                : aiWanted && ai.status === 'error'
                  ? 'border-bad/30 text-bad/90'
                  : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
            }`}
          >
            {!aiWanted
              ? `+ AI · ${AI_MODEL_MB} MB`
              : ai.status === 'ready'
                ? 'AI ✓'
                : ai.status === 'error'
                  ? 'AI unavailable'
                  : `AI loading ${Math.round(ai.progress * 100)}%`}
          </button>
        </Tooltip>
        <button type="button" onClick={() => setAdding((a) => !a)} className="text-dim transition-colors hover:text-soft">
          {adding ? 'done' : '+ always hide…'}
        </button>
      </div>
      {adding && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <input
              autoFocus
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="a name, company or place"
              className="h-6 w-48 rounded-md border border-line-2 bg-panel px-2 text-soft outline-none placeholder:text-faint focus:border-line-3"
            />
          </form>
          {words.map((w) => (
            <span key={w} className="inline-flex h-6 items-center gap-1 rounded-md border border-line-2 px-2 text-soft">
              {w}
              <button type="button" aria-label={`Stop hiding ${w}`} onClick={() => onWords(words.filter((x) => x !== w))} className="text-dim hover:text-fg">
                <X className="size-3" />
              </button>
            </span>
          ))}
          {!words.length && <span className="text-faint">saved in this browser only</span>}
        </div>
      )}
    </div>
  )
}

function BubblePhoto({ f }: { f: ChatFile }) {
  const url = useImageUrl(f.id)
  return url ? (
    <img src={url} alt={f.name} title={f.name} className="max-h-44 max-w-[260px] rounded-xl border border-line-2 object-cover" />
  ) : (
    <div className="flex h-24 w-32 items-center justify-center rounded-xl border border-line-2 font-mono text-[10px] text-dim">{url === null ? 'photo not stored' : '…'}</div>
  )
}

function BubbleDoc({ f }: { f: ChatFile }) {
  return (
    <div className="flex max-w-[280px] items-center gap-2.5 rounded-xl border border-line-2 bg-white/[0.03] px-3 py-2">
      <FileText className="size-4 shrink-0 text-dim" />
      <div className="min-w-0">
        <div className="truncate text-[13px] text-fg">{f.name}</div>
        <div className="truncate font-mono text-[10px] text-dim">
          {f.pages ? `${f.pages} page${f.pages === 1 ? '' : 's'} · ` : ''}
          {fmtChars(f.chars ?? 0)}
          {f.truncated ? ' · first part' : ''}
          {f.shielded ? <span className="text-ok/80"> · {f.shielded} hidden</span> : null}
        </div>
      </div>
    </div>
  )
}

/** The shielded text of an attached document, as the model received it (loaded on demand). */
function DocWire({ f }: { f: ChatFile }) {
  const [text, setText] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    void (async () => {
      const t = (await getText(`${f.id}.wire`)) ?? (await getText(f.id))
      if (alive) setText(t)
    })()
    return () => {
      alive = false
    }
  }, [f.id])
  return (
    <div className="max-h-64 w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-line px-3 py-2 font-mono text-[11.5px] leading-relaxed text-muted">
      {text === undefined ? '…' : text === null ? 'This file is no longer stored in this browser.' : text}
    </div>
  )
}

function UserBubble({ m }: { m: ChatMessage }) {
  const [show, setShow] = useState(false)
  const photos = m.files?.filter((f) => f.kind === 'photo') ?? []
  const docs = m.files?.filter((f) => f.kind === 'doc') ?? []
  const cleaned = [...new Set(photos.flatMap((p) => p.removed ?? []).map((r) => r.replace(/\s*\(.*$/, '')))]
  const faces = photos.reduce((n, p) => n + (p.faces ?? 0), 0)
  const covered = photos.reduce((n, p) => n + (p.covered ?? 0), 0)
  return (
    <div className="flex flex-col items-end">
      {!!m.files?.length && (
        <div className="mb-1.5 flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {photos.map((f) => (
            <BubblePhoto key={f.id} f={f} />
          ))}
          {docs.map((f) => (
            <BubbleDoc key={f.id} f={f} />
          ))}
        </div>
      )}
      {m.content && (
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line-2 bg-white/[0.045] px-4 py-2.5 text-[15px] leading-relaxed text-fg">{m.content}</div>
      )}
      {!!photos.length && (
        <div className="mt-1.5 inline-flex max-w-[85%] items-center gap-1 text-right font-mono text-[10.5px] text-ok/80">
          <ShieldCheck className="size-3 shrink-0" />
          cleaned in your browser
          {faces ? ` · ${faces} face${faces === 1 ? '' : 's'} blurred` : ''}
          {covered ? ` · ${covered} detail${covered === 1 ? '' : 's'} covered` : ''}
          {cleaned.length ? ` · ${cleaned.join(', ')} removed` : faces || covered ? '' : ' · no hidden data found'}
        </div>
      )}
      {(!!m.shielded || !!docs.length) && (
        <div className="mt-1.5 flex w-full max-w-[85%] flex-col items-end gap-1.5">
          <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1 font-mono text-[10.5px] text-ok/80 hover:text-ok">
            <ShieldCheck className="size-3" />
            {m.shielded ? `${m.shielded} hidden from the AI · ` : ''}
            {show ? 'hide' : 'show what it saw'}
          </button>
          {show && (
            <>
              {docs.map((f) => (
                <DocWire key={f.id} f={f} />
              ))}
              {m.content && <div className="whitespace-pre-wrap rounded-lg border border-line px-3 py-2 font-mono text-[12px] leading-relaxed text-muted">{m.wire ?? m.content}</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Files waiting to go with the next message. */
function AttachTray({
  items,
  onRemove,
  onBlur,
  onCover,
  warn,
}: {
  items: Attachment[]
  onRemove: (key: string) => void
  onBlur: (key: string) => void
  onCover: (key: string) => void
  warn?: string
}) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-2">
        {items.map((a) => {
          const photo = a.file?.kind === 'photo' ? a.file : null
          const doc = a.file?.kind === 'doc' ? a.file : null
          const removed = a.file?.removed ?? []
          const blurred = !!photo?.faces && a.blur !== false
          const facePart = photo?.faces ? `${photo.faces} face${photo.faces === 1 ? '' : 's'} ${blurred ? 'blurred' : 'shown'}` : ''
          const nCovered = photo?.covered.length ?? 0
          const coveredOn = nCovered > 0 && a.cover !== false
          const textPart = nCovered ? `${nCovered} detail${nCovered === 1 ? '' : 's'} ${coveredOn ? 'covered' : 'shown'}` : ''
          const dataPart = removed.length ? `${removed[0].replace(/\s*\(.*$/, '')} removed${removed.length > 1 ? ` +${removed.length - 1}` : ''}` : ''
          const note =
            a.status === 'reading'
              ? 'opening in your browser…'
              : a.status === 'error'
                ? a.error
                : photo
                  ? [facePart, textPart, dataPart].filter(Boolean).join(' · ') ||
                    (photo.faceCheckFailed || photo.textCheckFailed ? 'nothing found · a check was unavailable' : 'no hidden data, faces or details found')
                  : doc
                    ? `${doc.pages ? `${doc.pages} page${doc.pages === 1 ? '' : 's'} · ` : ''}${fmtChars(doc.text.length)} · ${fmtTokens(doc.text.length)}${doc.truncated ? ' · first part' : ''}`
                    : ''
          const tip =
            [removed.length ? `Stays in your browser: ${removed.join(', ')}` : '', nCovered ? `Covered in the picture: ${photo!.covered.map((c) => `${KIND_LABEL[c.kind]} · ${c.value}`).join(', ')}` : '']
              .filter(Boolean)
              .join('\n') || undefined
          const noteTone =
            a.status === 'error'
              ? 'text-bad/90'
              : (photo?.faces && !blurred) || (nCovered && !coveredOn)
                ? 'text-warn/90'
                : photo && (removed.length || blurred || coveredOn)
                  ? 'text-ok/90'
                  : 'text-dim'
          return (
            <div
              key={a.key}
              className={`flex h-14 max-w-[300px] items-center gap-2.5 rounded-lg border bg-panel py-2 pl-2 pr-1 ${a.status === 'error' ? 'border-bad/30' : 'border-line-2'}`}
            >
              {photo ? (
                <img src={photoUrl(photo, blurred, coveredOn)} alt="" className="size-10 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line-2 text-dim">
                  {a.status === 'reading' ? <Spinner /> : a.kind === 'photo' ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                </div>
              )}
              <div className="min-w-0 flex-1" title={tip}>
                <div className="truncate text-[12.5px] text-fg">{a.name}</div>
                <div className={`truncate font-mono text-[10px] ${noteTone}`}>{note}</div>
              </div>
              {!!photo?.faces && (
                <button
                  type="button"
                  onClick={() => onBlur(a.key)}
                  aria-pressed={blurred}
                  aria-label={blurred ? 'Send faces as they are' : 'Blur faces'}
                  title={blurred ? 'Faces are blurred before sending. Click to send them as they are.' : 'Faces will be sent as they are. Click to blur them.'}
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md ${blurred ? 'text-ok/90 hover:text-ok' : 'text-warn/90 hover:text-warn'}`}
                >
                  <ScanFace className="size-3.5" />
                </button>
              )}
              {nCovered > 0 && (
                <button
                  type="button"
                  onClick={() => onCover(a.key)}
                  aria-pressed={coveredOn}
                  aria-label={coveredOn ? 'Send the text as it is' : 'Cover personal details'}
                  title={coveredOn ? 'Personal details in this picture are covered before sending. Click to send it as it is.' : 'The text will be sent as it is. Click to cover the details again.'}
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md ${coveredOn ? 'text-ok/90 hover:text-ok' : 'text-warn/90 hover:text-warn'}`}
                >
                  <ScanText className="size-3.5" />
                </button>
              )}
              <button type="button" onClick={() => onRemove(a.key)} aria-label={`Remove ${a.name}`} className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-dim hover:text-fg">
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
      <p className={`mt-1.5 font-mono text-[10.5px] ${warn ? 'text-warn/90' : 'text-dim'}`}>
        {warn ?? 'Opened in your browser: documents go as text, photos as clean copies without location or camera data, faces blurred and details in screenshots covered.'}
      </p>
    </div>
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

function EmptyState({
  onPick,
  disabled,
  web,
  image,
  shieldOn,
  compare,
}: {
  onPick: (s: string) => void
  disabled: boolean
  web: boolean
  image: boolean
  shieldOn: boolean
  compare: boolean
}) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 pt-[12vh] text-center">
      <LogoMark className="size-11 text-fg" />
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.03em] text-fg">
        {image ? 'Imagine privately.' : compare ? 'Compare privately.' : web ? 'Search privately.' : 'Ask privately.'}
      </h1>
      <p className="mt-3 max-w-[480px] text-[14.5px] leading-relaxed text-muted">
        {compare
          ? 'Compare is on: every message goes to two models and both answers appear side by side, each with its own time and cost.'
          : image
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
      {shieldOn && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-ok/80">
          <ShieldCheck className="size-3" />
          Prompt Shield is on: names, emails, numbers and addresses are swapped for placeholders before sending
        </p>
      )}
      {!image && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-dim">
          <Paperclip className="size-3" />
          Attach PDFs, text files or photos: opened in your browser, photos lose their GPS location, faces and personal details are hidden
        </p>
      )}
      <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-dim">
        <Mic className="size-3" />
        Talk instead of typing: Whisper turns speech into text in your browser, your voice is never sent
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

/** One model's answer inside a compare row. */
function AnswerPane({ a, streaming, phase }: { a: AltAnswer; streaming: boolean; phase: string }) {
  const done = !streaming || a.ms != null || !!a.error
  return (
    <div className="min-w-0 rounded-xl border border-line-2 bg-panel/40 px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2 font-mono text-[10.5px] tracking-[0.08em]">
        <span className="text-fg">{modelLabel(a.model)}</span>
        {a.costUsd != null && (
          <Tooltip content={COST_TIP}>
            <span className="text-soft">{fmtCost(a.costUsd)}</span>
          </Tooltip>
        )}
      </div>
      {a.content ? <Markdown text={a.content} /> : null}
      {!done && !a.content && (
        <div className="flex items-center gap-2.5 py-1 font-mono text-[12px] text-muted">
          <Spinner className="size-3.5" />
          {phase || 'Thinking…'}
        </div>
      )}
      {!done && a.content && <span className="ml-0.5 inline-block w-[7px] animate-blink text-eth">▍</span>}
      {!!a.sources?.length && <Sources list={a.sources} />}
      {a.error && <div className="mt-2 rounded-md border border-bad/25 bg-bad/[0.05] px-3 py-2 text-[13px] text-bad/90">{a.error}</div>}
      {done && !a.error && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-dim">
          {a.ms != null && <span>{(a.ms / 1000).toFixed(1)}s</span>}
          {a.wire != null && a.wire !== a.content && (
            <span className="inline-flex items-center gap-1 text-ok/80">
              <ShieldCheck className="size-3" />
              shield
            </span>
          )}
          <span className="text-ok/80">paid by proof ✓</span>
        </div>
      )}
    </div>
  )
}

/** Compare mode: the same message answered by two models, side by side. */
function CompareRow({ m, phase, streaming, onRetry }: { m: ChatMessage; phase: string; streaming: boolean; onRetry?: () => void }) {
  const first: AltAnswer = { model: m.model ?? '', content: m.content, wire: m.wire, ms: m.ms, costUsd: m.costUsd, error: m.error, sources: m.sources }
  const both = (m.costUsd ?? 0) + (m.alt?.costUsd ?? 0)
  return (
    <div className="flex gap-3.5">
      <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-line-2 text-soft">
        <Columns2 className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="grid gap-3 md:grid-cols-2">
          <AnswerPane a={first} streaming={streaming} phase={phase} />
          {m.alt && <AnswerPane a={m.alt} streaming={streaming} phase={phase} />}
        </div>
        {!streaming && (
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-dim">
            {both > 0 && <span>both answers {fmtCost(both)}</span>}
            {onRetry && (m.error || m.alt?.error) && (
              <button type="button" onClick={onRetry} className="tracking-[0.12em] text-soft underline-offset-2 hover:underline">
                RETRY
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Messages({ conv, phase, streamingId, onRetry }: { conv: Conversation; phase: string; streamingId: string | null; onRetry: () => void }) {
  const wide = conv.messages.some((m) => m.alt)
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-[1120px]' : 'max-w-[780px]'} space-y-7 px-4 py-8 sm:px-6`}>
      {conv.messages.map((m, i) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} m={m} />
        ) : m.alt ? (
          <CompareRow key={m.id} m={m} phase={phase} streaming={streamingId === m.id} onRetry={i === conv.messages.length - 1 ? onRetry : undefined} />
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
                  {m.costUsd != null && (
                    <Tooltip content={COST_TIP}>
                      <span className="text-soft">{fmtCost(m.costUsd)}</span>
                    </Tooltip>
                  )}
                  {m.wire != null && m.wire !== m.content && (
                    <Tooltip content="The model wrote placeholders. Your browser filled the real details back in.">
                      <span className="inline-flex items-center gap-1 text-ok/80">
                        <ShieldCheck className="size-3" />
                        shield
                      </span>
                    </Tooltip>
                  )}
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
  const [shieldCfg, setShieldCfg] = useState(loadShield)
  const [skip, setSkip] = useState<Set<string>>(() => new Set())
  const [attached, setAttached] = useState<Attachment[]>([])
  const attachedRef = useRef(attached)
  attachedRef.current = attached
  const [preparing, setPreparing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [voiceNote, setVoiceNote] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    try {
      localStorage.setItem(SHIELD_KEY, JSON.stringify(shieldCfg))
    } catch {
      /* settings stay for this tab */
    }
  }, [shieldCfg])

  // AI Shield: load the in-browser model when it is switched on, then run it on what is typed
  const [ai, setAi] = useState<AiStatus>({ status: 'off', progress: 0 })
  const [aiHits, setAiHits] = useState<{ text: string; hits: ShieldHit[] }>({ text: '', hits: [] })
  const aiWanted = shieldCfg.on && shieldCfg.ai
  useEffect(() => {
    if (!aiWanted) return
    let alive = true
    setAi((a) => (a.status === 'ready' ? a : { status: 'loading', progress: 0 }))
    loadAiShield((p) => alive && setAi({ status: 'loading', progress: p }))
      .then(() => alive && setAi({ status: 'ready', progress: 1 }))
      .catch(() => alive && setAi({ status: 'error', progress: 0 }))
    return () => {
      alive = false
    }
  }, [aiWanted])
  useEffect(() => {
    if (!aiWanted || ai.status !== 'ready' || !input.trim()) return
    const t = setTimeout(() => {
      void detectAi(input)
        .then((found) => setAiHits({ text: input, hits: found }))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [input, aiWanted, ai.status])
  const aiCurrent = aiWanted && ai.status === 'ready' && aiHits.text === input
  const { hits, aiKeys } = useMemo(() => {
    if (!shieldCfg.on || !input.trim()) return { hits: [], aiKeys: new Set<string>() }
    const found = detect(input, shieldCfg.words)
    if (!aiCurrent) return { hits: found, aiKeys: new Set<string>() }
    // pattern hits win ties, so only what the patterns missed is marked "AI"
    const merged = mergeHits(found, aiHits.hits)
    const fromAi = new Set(aiHits.hits)
    return { hits: merged, aiKeys: new Set(merged.filter((h) => fromAi.has(h)).map((h) => `${h.start}:${h.end}`)) }
  }, [input, shieldCfg, aiCurrent, aiHits])

  // attached documents: what the shield will hide in each (the AI pass runs once per file)
  const [docAi, setDocAi] = useState<Record<string, ShieldHit[]>>({})
  useEffect(() => {
    if (!aiWanted || ai.status !== 'ready') return
    for (const a of attached) {
      if (a.file?.kind !== 'doc' || docAi[a.key]) continue
      const key = a.key
      void detectAi(docBlock(a.file))
        .then((found) => setDocAi((d) => ({ ...d, [key]: found })))
        .catch(() => setDocAi((d) => ({ ...d, [key]: [] })))
    }
  }, [attached, aiWanted, ai.status, docAi])
  const fileHits = useMemo(
    () =>
      shieldCfg.on
        ? attached.flatMap((a) => {
            if (a.file?.kind !== 'doc') return []
            let found = detect(docBlock(a.file), shieldCfg.words)
            if (aiWanted && ai.status === 'ready' && docAi[a.key]) found = mergeHits(found, docAi[a.key])
            return [{ name: a.name, count: found.filter((h) => !skip.has(h.value)).length }]
          })
        : [],
    [attached, shieldCfg, aiWanted, ai.status, docAi, skip],
  )

  const addFiles = (list: FileList | File[]) => {
    const incoming = [...list]
    if (!incoming.length) return
    const room = Math.max(0, MAX_FILES - attachedRef.current.length)
    const take = incoming.slice(0, room)
    const items: Attachment[] = take.map((f) => ({
      key: randId('file', 8),
      name: f.name || 'pasted image',
      kind: fileKind(f) ?? 'doc',
      status: 'reading',
      ...(shieldCfg.on ? {} : { cover: false }),
    }))
    const readOpts = { words: shieldCfg.words, ai: aiWanted && ai.status === 'ready' ? detectAi : undefined }
    if (incoming.length > take.length)
      items.push({ key: randId('file', 8), name: `${incoming.length - take.length} more file${incoming.length - take.length === 1 ? '' : 's'}`, kind: 'doc', status: 'error', error: `Up to ${MAX_FILES} files per message.` })
    setAttached((cur) => [...cur, ...items])
    take.forEach((f, i) => {
      const key = items[i].key
      void readFile(f, readOpts).then(
        (file) => setAttached((c) => c.map((a) => (a.key === key ? { ...a, status: 'ready', file } : a))),
        (err) => setAttached((c) => c.map((a) => (a.key === key ? { ...a, status: 'error', error: errorMessage(err) } : a))),
      )
    })
  }
  const removeFile = (key: string) => setAttached((c) => c.filter((a) => a.key !== key))
  const readyFiles = attached.filter((a) => a.status === 'ready' && a.file)
  const stillReading = attached.some((a) => a.status === 'reading')
  const compareModel = conv.compare && !conv.image ? (conv.model2 ?? secondModel(conv.model)) : null
  const blind = attached.some((a) => a.file?.kind === 'photo') ? [conv.model, compareModel].filter((m): m is string => !!m && !canSee(m)) : []
  const fileWarn = blind.length ? `${blind.map(modelLabel).join(' and ')} read${blind.length === 1 ? 's' : ''} text only: pick a model that can see to send photos.` : undefined

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
    async (target: Conversation) => {
      const imageModel = target.imageModel ?? DEFAULT_IMAGE_MODEL
      const compare = !!target.compare && !target.image
      const model2 = target.model2 ?? secondModel(target.model)
      const reply = newMessage('assistant', '', {
        model: target.image ? imageModel : target.model,
        ...(target.image ? { image: true } : target.web ? { web: true } : {}),
        ...(compare ? { alt: { model: model2, content: '' } } : {}),
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
      const shielded = !!target.shieldMap && Object.keys(target.shieldMap).length > 0
      const patch = (fields: Partial<ChatMessage>) =>
        update(withReply.id, (c) => ({ ...c, updatedAt: Date.now(), messages: c.messages.map((m) => (m.id === reply.id ? { ...m, ...fields } : m)) }))
      const patchAlt = (fields: Partial<AltAnswer>) =>
        update(withReply.id, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) => (m.id === reply.id ? { ...m, alt: { ...(m.alt ?? { model: model2, content: '' }), ...fields } } : m)),
        }))
      let textB = ''
      let sourcesB: Source[] = []
      const hooksB: SendHooks = {
        signal: ctrl.signal,
        onPhase: (p: string) => setPhase(p),
        onDelta: (d: string) => {
          textB += d
          patchAlt(shielded ? { wire: textB, content: restore(textB, target.shieldMap ?? {}) } : { content: textB })
        },
        web: !!target.web,
        shield: shielded,
        onSources: (s: Source[]) => {
          const next = mergeSources(sourcesB, s)
          if (next.length === sourcesB.length) return
          sourcesB = next
          patchAlt({ sources: sourcesB })
        },
        onCost: (usd: number) => patchAlt({ costUsd: usd }),
      }
      const hooks: SendHooks = {
        signal: ctrl.signal,
        onPhase: (p: string) => setPhase(p),
        onDelta: (d: string) => {
          text += d
          patch(shielded ? { wire: text, content: restore(text, target.shieldMap ?? {}) } : { content: text })
        },
        web: !!target.web,
        shield: shielded,
        onSources: (s: Source[]) => {
          const next = mergeSources(sources, s)
          if (next.length === sources.length) return
          sources = next
          patch({ sources })
        },
        onCost: (usd: number) => patch({ costUsd: usd }),
      }
      try {
        if (target.image) {
          const lastUser = [...target.messages].reverse().find((m) => m.role === 'user')
          const prompt = lastUser?.wire ?? lastUser?.content ?? ''
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
        let client: ZkClient | null = null
        if (IS_LIVE && live) {
          // a different chat still holds the key: settle it first so chats never share one
          if (keyOwner.current && keyOwner.current.id !== withReply.id) await endSession()
          client = await live.client()
          if (!keyOwner.current) keyOwner.current = { id: withReply.id, startEth: live.balanceEth }
        }
        // one side per model; in compare mode both run at once on this chat's key
        const side = async (model: string, history: WireMessage[], h: SendHooks, done: (f: { ms?: number; error?: string }) => void) => {
          const ts = performance.now()
          try {
            if (client) await sendLive(client, withReply.id, model, history, h)
            else {
              await sendDemo(model, history, h)
              const svc = model.includes('gpt') ? 'gpt' : model.includes('auto') ? 'openrouter' : 'claude'
              spend(svc, 0.012, randHex(32), `chat · ${modelLabel(model)}`)
            }
            done({ ms: performance.now() - ts })
          } catch (err) {
            done(ctrl.signal.aborted ? { ms: performance.now() - ts } : { error: errorMessage(err) })
          }
        }
        const [historyA, historyB] = await Promise.all([
          toWire(target.messages, 'a', canSee(target.model)),
          compare ? toWire(target.messages, 'b', canSee(model2)) : null,
        ])
        await Promise.all([side(target.model, historyA, hooks, patch), compare && historyB ? side(model2, historyB, hooksB, patchAlt) : null])
        if (!client && target.web) spend('web-search', 0.0021, randHex(32), `web search · ${sources.length} sources`)
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

  const send = async (text: string) => {
    const content = text.trim()
    const files = conv.image ? [] : readyFiles
    if ((!content && !files.length) || sending || preparing || !canSend || stillReading || blind.length) return
    setPreparing(true)
    try {
      // Prompt Shield: swap personal details for placeholders before anything leaves the browser
      let map = conv.shieldMap ?? {}
      let extra: Partial<ChatMessage> = {}
      let hidden = 0
      const shieldText = async (s: string) => {
        let found = detect(s, shieldCfg.words)
        if (aiWanted && ai.status === 'ready') found = mergeHits(found, await detectAi(s).catch(() => []))
        const r = shield(s, found, map, skip)
        map = r.map
        hidden += r.used.length
        return r
      }
      if (shieldCfg.on && content) {
        const s = await shieldText(content)
        if (s.used.length) extra = { wire: s.text }
      }
      // files: stored in this browser; documents also as the shielded text the model will see
      const stored: ChatFile[] = []
      for (const a of files) {
        const f = a.file!
        if (f.kind === 'photo') {
          const id = randId('pic', 12)
          const blur = a.blur !== false && f.faces > 0
          const cover = a.cover !== false && f.covered.length > 0
          await putImage(id, photoUrl(f, blur, cover))
          stored.push({ id, kind: 'photo', name: f.name, mime: f.mime, removed: f.removed, faces: blur ? f.faces : 0, covered: cover ? f.covered.length : 0 })
          continue
        }
        const id = randId('doc', 12)
        const block = docBlock(f)
        await putText(id, block)
        let shielded = 0
        if (shieldCfg.on) {
          const s = await shieldText(block)
          if (s.used.length) {
            await putText(`${id}.wire`, s.text)
            shielded = s.used.length
          }
        }
        stored.push({ id, kind: 'doc', name: f.name, pages: f.pages, chars: f.text.length, truncated: f.truncated, removed: f.removed, shielded })
      }
      if (hidden) extra = { ...extra, shielded: hidden }
      const user = newMessage('user', content, { ...extra, ...(stored.length ? { files: stored } : {}) })
      const base = conv.messages.length ? conv : { ...conv, title: titleFrom(content || stored[0]?.name || '') }
      const next = { ...base, shieldMap: map, messages: [...base.messages, user], updatedAt: Date.now() }
      setInput('')
      setSkip(new Set())
      setVoiceNote(null)
      if (stored.length) {
        setAttached([])
        setDocAi({})
      }
      void run(next)
    } catch (err) {
      setAttached((c) => [...c, { key: randId('file', 8), name: 'Could not attach', kind: 'doc', status: 'error', error: errorMessage(err) }])
    } finally {
      setPreparing(false)
    }
  }

  const retry = () => {
    const msgs = conv.messages
    const last = msgs[msgs.length - 1]
    if (!last || last.role !== 'assistant') return
    const trimmed = { ...conv, messages: msgs.slice(0, -1) }
    void run(trimmed)
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
    if (!conv.image) setAttached([])
    setConv({ image: !conv.image, web: false, compare: false })
    textarea.current?.focus()
  }

  const toggleCompare = () => {
    setConv({ compare: !conv.compare, image: false, model2: conv.model2 ?? secondModel(conv.model) })
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
          {conv.compare && !conv.image && (
            <>
              <span className="font-mono text-[11px] text-dim">vs</span>
              <label className="relative">
                <span className="sr-only">Second model</span>
                <select
                  value={conv.model2 ?? secondModel(conv.model)}
                  onChange={(e) => setConv({ model2: e.target.value })}
                  disabled={sending}
                  className="h-9 appearance-none rounded-md border border-eth/30 bg-panel pl-3 pr-8 font-mono text-[11.5px] tracking-[0.04em] text-fg outline-none transition-colors hover:border-eth/50 focus:border-eth/50 disabled:opacity-50"
                >
                  {VENDORS.map((v) => (
                    <optgroup key={v} label={v}>
                      {MODELS.filter((m) => m.vendor === v).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-dim" />
              </label>
            </>
          )}
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
          {conv.messages.length === 0 ? <EmptyState onPick={send} disabled={!canSend} web={!!conv.web} image={!!conv.image} shieldOn={shieldCfg.on} compare={!!conv.compare && !conv.image} /> : <Messages conv={conv} phase={phase} streamingId={streamingId} onRetry={retry} />}
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
            {voiceNote && (
              <div className={`mb-2 flex items-start gap-1.5 font-mono text-[10.5px] leading-relaxed ${voiceNote.tone === 'ok' ? 'text-ok/85' : 'text-warn/90'}`}>
                <Mic className="mt-[2px] size-3 shrink-0" />
                <span className="flex-1">{voiceNote.text}</span>
                <button type="button" onClick={() => setVoiceNote(null)} aria-label="Dismiss" className="text-dim hover:text-fg">
                  <X className="size-3" />
                </button>
              </div>
            )}
            {!conv.image && attached.length > 0 && <AttachTray
                items={attached}
                onRemove={removeFile}
                onBlur={(key) => setAttached((c) => c.map((a) => (a.key === key ? { ...a, blur: a.blur === false } : a)))}
                onCover={(key) => setAttached((c) => c.map((a) => (a.key === key ? { ...a, cover: a.cover === false } : a)))}
                warn={fileWarn}
              />}
            {shieldCfg.on && (input.trim() || fileHits.length > 0) && (
              <ShieldBar
                files={fileHits}
                hits={hits}
                skip={skip}
                onToggle={(v) =>
                  setSkip((s) => {
                    const n = new Set(s)
                    if (n.has(v)) n.delete(v)
                    else n.add(v)
                    return n
                  })
                }
                words={shieldCfg.words}
                onWords={(words) => setShieldCfg((c) => ({ ...c, words }))}
                ai={ai}
                aiWanted={aiWanted}
                aiKeys={aiKeys}
                onAi={() => setShieldCfg((c) => ({ ...c, ai: !c.ai }))}
              />
            )}
            <div
              onDragOver={(e) => {
                if (conv.image || !e.dataTransfer.types.includes('Files')) return
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                setDragging(false)
                if (conv.image || !e.dataTransfer.files.length) return
                e.preventDefault()
                addFiles(e.dataTransfer.files)
              }}
              className={`flex items-end gap-2 rounded-xl border bg-panel px-3 py-2.5 transition-colors focus-within:border-line-3 ${dragging ? 'border-ok/50 bg-ok/[0.04]' : 'border-line-2'}`}
            >
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <Tooltip
                content={
                  conv.image
                    ? 'Files can’t be attached in image mode.'
                    : 'Attach PDFs, text files or photos. They are opened in your browser: documents go as text through Prompt Shield, photos as clean copies without GPS location, camera or date, with faces blurred and emails, wallets or numbers in screenshots covered.'
                }
              >
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={sending || conv.image || attached.length >= MAX_FILES}
                  aria-label="Attach files"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    attached.length ? 'border-ok/35 bg-ok/[0.08] text-ok/90' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <Paperclip className="size-3.5" />
                  {attached.length > 0 && <span>{attached.length}</span>}
                </button>
              </Tooltip>
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
              <Tooltip
                content={
                  shieldCfg.on
                    ? 'Prompt Shield is on: names, emails, phone numbers, addresses, wallets and keys are swapped for placeholders in your browser before sending.'
                    : 'Prompt Shield is off: messages are sent exactly as written.'
                }
              >
                <button
                  type="button"
                  onClick={() => setShieldCfg((c) => ({ ...c, on: !c.on }))}
                  aria-pressed={shieldCfg.on}
                  aria-label="Prompt Shield"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors ${
                    shieldCfg.on ? 'border-ok/35 bg-ok/[0.08] text-ok/90' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                  <span className="hidden sm:inline">SHIELD</span>
                </button>
              </Tooltip>
              <Tooltip content={conv.compare ? 'Compare is on: two models answer every message, side by side. Each answer is paid separately.' : 'Ask two models at once and compare their answers.'}>
                <button
                  type="button"
                  onClick={toggleCompare}
                  disabled={sending}
                  aria-pressed={!!conv.compare}
                  aria-label="Compare two models"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.compare ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <Columns2 className="size-3.5" />
                  <span className="hidden sm:inline">COMPARE</span>
                </button>
              </Tooltip>
              <textarea
                ref={textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  if (conv.image || !e.clipboardData.files.length) return
                  e.preventDefault()
                  addFiles(e.clipboardData.files)
                }}
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
                        : readyFiles.length
                          ? 'Ask about your files…'
                          : 'Ask privately…'
                    : IS_LIVE && account.status === 'loading'
                      ? 'Connecting to zkAPI…'
                      : IS_LIVE && account.status === 'error'
                        ? 'zkAPI is unavailable'
                        : 'Fund a private balance to start'
                }
                className="max-h-[220px] min-h-[26px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-fg outline-none placeholder:text-dim disabled:opacity-60"
              />
              <VoiceButton
                disabled={!canSend || sending}
                onNote={setVoiceNote}
                onText={(t) => {
                  setInput((cur) => (cur.trim() ? `${cur.trimEnd()} ${t}` : t))
                  setTimeout(() => textarea.current?.focus(), 30)
                }}
              />
              {sending ? (
                <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-2 text-soft hover:text-fg">
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={(!input.trim() && (conv.image || !readyFiles.length)) || !canSend || preparing || stillReading || blind.length > 0}
                  aria-label="Send"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-fg text-bg transition-opacity disabled:opacity-25"
                >
                  <ArrowUp className="size-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
            <PrivacyLine web={!!conv.web} image={!!conv.image} shieldOn={shieldCfg.on} />
          </div>
        </div>
      </main>
    </div>
  )
}

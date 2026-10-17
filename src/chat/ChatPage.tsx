import { AnimatePresence, motion } from 'framer-motion'
import type { ZkClient } from '@openanonymity/zkapi-browser-sdk'
import { ArrowUp, ArrowUpFromLine, Brain, Check, ChevronDown, Columns2, Download, ExternalLink, FileText, Ghost, Globe, ImageIcon, LockKeyhole, Menu, Mic, Paperclip, Plus, ScanFace, ScanText, Share2, ShieldAlert, ShieldCheck, Square, Telescope, Trash2, Users, X } from 'lucide-react'
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
import { randHex, randId, sleep } from '../lib/random'
import { errorMessage } from '../live/client'
import type { Source } from '../live/stream'
import { checkConnection, recheckConnection, useConnection, type Connection } from '../live/connection'
import { useLive } from '../live/LiveProvider'
import { useAccount } from '../live/useAccount'
import { useActions } from '../state/actions'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { sendDemo, sendImageDemo, sendImageLive, sendLive, type GeneratedImage, type SendHooks, type WireMessage } from './engine'
import { ACCEPT, fileKind, MAX_FILES, photoUrl, readFile, type DocFile, type ReadFile } from './files'
import type { BackupContents } from './backup'
import { BackupDialog, type RestoreResult } from './BackupDialog'
import { useCrowd } from './crowd'
import { ShareDialog, type ShareItem } from './ShareDialog'
import { CrowdDialog } from './CrowdDialog'
import { fitLevel, loadMemoryModel, MAX_RECALL, memoryBlock, recall, useMemory, type Recalled } from './memory'
import { MemoryDialog, type ModelStatus } from './MemoryDialog'
import { clearOutbox, installOutbox, useOutbox } from './outbox'
import { OutboxDialog } from './OutboxDialog'
import { deleteImages, fileId, getImageBlob, getImageDataUrl, getText, putBlob, putImage, putText, useImageUrl } from './images'
import { Markdown } from './Markdown'
import { researchDemo, researchLive, type ResearchHooks, type ResearchStep } from './research'
import { VoiceButton } from './VoiceButton'
import { AI_MODEL_MB, detectAi, loadAiShield, mergeHits } from './aiShield'
import { detect, KIND_LABEL, restore, shield, type ShieldHit } from './shield'
import { newConversation, newMessage, titleFrom, useConversations, type AltAnswer, type ChatFile, type ChatMessage, type Conversation } from './store'

// the Outbox starts listing requests before anything on the chat page runs
if (window.location.pathname === '/chat') installOutbox()

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

const RESEARCH_SUGGESTIONS = [
  'Compare Signal, Session and SimpleX for private messaging.',
  'How do zero-knowledge proofs keep payments private?',
  'What changed on Ethereum in 2026 so far?',
  'Is it safe to keep a seed phrase in a password manager?',
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

/** Auto-delete: chats untouched for this many days are removed from this browser (0 = keep). */
const AUTO_KEY = 'null.autodelete.v1'
const AUTO_OPTIONS = [
  { days: 0, label: 'off' },
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
]
function loadAutoDelete(): number {
  try {
    const n = Number(localStorage.getItem(AUTO_KEY))
    return AUTO_OPTIONS.some((o) => o.days === n) ? n : 0
  } catch {
    return 0
  }
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
    const mem = m.role === 'user' && m.memory?.length ? memoryBlock(m.memory.map((n) => n.wire ?? n.text)) : ''
    if (m.role !== 'user' || (!m.files?.length && !mem)) {
      out.push({ role: m.role, content: text })
      continue
    }
    const docs = await Promise.all(
      (m.files ?? [])
        .filter((f) => f.kind === 'doc')
        .map(async (f) => (await getText(`${f.id}.wire`)) ?? (await getText(f.id)) ?? `<document name="${docName(f.name)}">\n(no longer stored in this browser)\n</document>`),
    )
    const body = [mem, ...docs, text].filter(Boolean).join('\n\n')
    const photos = (m.files ?? []).filter((f) => f.kind === 'photo')
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

function BalanceMini({ onCrowd }: { onCrowd: () => void }) {
  const account = useAccount()
  const { fund, withdraw } = useActions()
  const crowd = useCrowd()
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
      <button type="button" onClick={onCrowd} className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[10.5px] text-ok/80 hover:text-ok">
        <Users className="size-3" />
        {crowd.data ? `hidden among ${crowd.data.open} open notes` : 'your crowd'} ›
      </button>
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
  onBackup,
  autoDays,
  onAutoDays,
  onCrowd,
  memory,
  onMemory,
}: {
  list: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onClear: () => void
  onBackup: (tab: 'export' | 'import') => void
  autoDays: number
  onAutoDays: (days: number) => void
  onCrowd: () => void
  memory: { on: boolean; count: number }
  onMemory: () => void
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
        {list.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-[12.5px] leading-relaxed text-dim">Your chats stay in this browser. Nothing is saved on a server.</p>
            <button type="button" onClick={() => onBackup('import')} className="mt-3 font-mono text-[10.5px] tracking-[0.1em] text-soft underline decoration-line-3 underline-offset-4 hover:text-fg">
              restore an encrypted backup
            </button>
          </div>
        )}
        {list.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-md transition-colors ${c.id === activeId ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
          >
            <button type="button" onClick={() => onSelect(c.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
              <div className={`flex items-center gap-1.5 truncate text-[13px] ${c.id === activeId ? 'text-fg' : 'text-soft'}`}>
                {c.paranoid ? <ShieldAlert className="size-3.5 shrink-0 text-warn" /> : c.ghost && <Ghost className="size-3.5 shrink-0 text-eth" />}
                <span className="truncate">{c.title}</span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[10.5px] text-dim">
                {c.paranoid ? 'paranoid · Tor only · erased when you leave it' : c.ghost ? 'ghost · erased when you leave it' : c.image ? modelLabel(c.imageModel ?? DEFAULT_IMAGE_MODEL) : c.compare ? `${modelLabel(c.model)} vs ${modelLabel(c.model2 ?? secondModel(c.model))}` : modelLabel(c.model)} ·{' '}
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
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onMemory}
          className="flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-left font-mono text-[10.5px] tracking-[0.12em] text-dim transition-colors hover:border-line-3 hover:text-soft"
        >
          <Brain className={`size-3.5 ${memory.on && memory.count ? 'text-eth' : ''}`} />
          MEMORY
          <span className={`ml-auto tracking-normal ${memory.on && memory.count ? 'text-eth/80' : 'text-faint'}`}>
            {!memory.count ? 'in this browser only' : `${memory.count} note${memory.count === 1 ? '' : 's'}${memory.on ? '' : ' · off'}`}
          </span>
        </button>
      </div>
      {list.length > 0 && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => onBackup('export')}
            className="flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-left font-mono text-[10.5px] tracking-[0.12em] text-dim transition-colors hover:border-line-3 hover:text-soft"
          >
            <LockKeyhole className="size-3.5" />
            ENCRYPTED BACKUP
            <span className="ml-auto tracking-normal text-faint">back up · restore</span>
          </button>
        </div>
      )}
      {(list.length > 0 || autoDays > 0) && (
        <label className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-line px-3 py-1.5 font-mono text-[10.5px] tracking-[0.12em] text-dim">
          <Trash2 className="size-3.5 shrink-0" />
          AUTO-DELETE
          <Tooltip content="Chats you haven't used for this long are deleted from this browser, files and images too. Backups you saved are not touched.">
            <select
              value={autoDays}
              onChange={(e) => onAutoDays(Number(e.target.value))}
              className={`ml-auto bg-transparent text-right tracking-normal outline-none ${autoDays ? 'text-ok/90' : 'text-faint'}`}
            >
              {AUTO_OPTIONS.map((o) => (
                <option key={o.days} value={o.days} className="bg-panel text-fg">
                  {o.label}
                </option>
              ))}
            </select>
          </Tooltip>
        </label>
      )}
      <BalanceMini onCrowd={onCrowd} />
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
/** The header's way into the Outbox, with how many requests this tab has sent. */
function OutboxButton({ onClick }: { onClick: () => void }) {
  const { entries } = useOutbox()
  const n = entries.filter((e) => !e.demo).length
  return (
    <Tooltip content="Outbox: every request this page sent, with exactly what was in it. Don't trust us, check it.">
      <button
        type="button"
        onClick={onClick}
        aria-label="Open the outbox"
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-2 px-2.5 font-mono text-[10px] tracking-[0.14em] text-dim transition-colors hover:border-line-3 hover:text-soft"
      >
        <ArrowUpFromLine className="size-3.5" />
        <span className="hidden sm:inline">OUTBOX</span>
        {n > 0 && <span className="tracking-normal text-soft">{n}</span>}
      </button>
    </Tooltip>
  )
}

/** paranoid mode: no detail can be clicked to "send as written" */
const NO_SKIP: Set<string> = new Set()

const PARANOID_RULES = [
  'Tor only: NULL checks before every message and sends nothing if you’re not on Tor',
  'Nothing saved, not even in this browser',
  'AI Shield always on: names, places, emails and numbers become placeholders',
  'A random 2–8 s delay, so the request doesn’t leave the moment you hit send',
  'Memory, web search, research, images and files are off',
]

const torProblem = (c: Connection) =>
  c.status === 'error'
    ? 'Couldn’t check for Tor, so nothing was sent. Try again in a moment.'
    : 'You’re not on Tor, so nothing was sent. Open NULL in Tor Browser to use paranoid mode.'

/** Paranoid mode, above the composer: each guarantee and whether it holds right now. */
function ParanoidBar({ note, ai }: { note: string | null; ai: AiStatus }) {
  const c = useConnection()
  const { open } = useUi()
  const mark = (state: 'ok' | 'wait' | 'bad', label: string) => (
    <span className={`inline-flex items-center gap-1 ${state === 'ok' ? 'text-ok/90' : state === 'wait' ? 'text-dim' : 'text-bad/90'}`}>
      {state === 'ok' ? '✓' : state === 'wait' ? '…' : '✗'} {label}
    </span>
  )
  return (
    <div className="mb-2 rounded-lg border border-dashed border-warn/35 bg-warn/[0.03] px-3 py-2 font-mono text-[10.5px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1 tracking-[0.12em] text-warn">
          <ShieldAlert className="size-3.5" />
          PARANOID
        </span>
        {c.status === 'done' && c.tor ? (
          mark('ok', 'Tor')
        ) : c.status === 'done' || c.status === 'error' ? (
          <button type="button" onClick={() => open({ name: 'tor' })} className="text-bad/90 underline-offset-2 hover:underline">
            ✗ {c.status === 'error' ? 'Tor check failed' : 'not on Tor'} · how to
          </button>
        ) : (
          mark('wait', 'checking Tor')
        )}
        {mark('ok', 'nothing saved')}
        {ai.status === 'ready' ? mark('ok', 'AI Shield') : ai.status === 'error' ? mark('bad', 'AI Shield unavailable') : mark('wait', `AI Shield ${Math.round(ai.progress * 100)}%`)}
        {mark('ok', 'random delay 2–8 s')}
        {mark('ok', 'memory, web, files off')}
      </div>
      {note && <p className="mt-1.5 text-warn/90">{note}</p>}
    </div>
  )
}

/** The memory notes that will go along with the message being typed; click one to leave it out. */
function MemoryBar({ list, skip, onToggle, onManage }: { list: Recalled[]; skip: Set<string>; onToggle: (id: string) => void; onManage: () => void }) {
  const going = list.filter((r) => !skip.has(r.note.id)).length
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
      <span className="inline-flex items-center gap-1 tracking-[0.12em] text-eth">
        <Brain className="size-3.5" />
        MEMORY
      </span>
      <span className="text-dim">{list.length ? `${going} note${going === 1 ? ' goes' : 's go'} along` : 'no note fits, nothing from your memory goes along'}</span>
      {list.map((r) => {
        const off = skip.has(r.note.id)
        return (
          <button
            key={r.note.id}
            type="button"
            onClick={() => onToggle(r.note.id)}
            title={off ? 'Stays in this browser. Click to send it along.' : `Fits this message${['', '', ' well', ' strongly'][fitLevel(r.fit)]}. Click to leave it out.`}
            className={`h-6 max-w-[260px] truncate rounded-md border px-2 transition-colors ${
              off ? 'border-line-2 text-dim line-through' : 'border-eth/35 bg-eth/[0.08] text-eth hover:border-eth/60'
            }`}
          >
            {r.note.text}
          </button>
        )
      })}
      <button type="button" onClick={onManage} className="ml-auto text-dim hover:text-soft">
        manage · up to {MAX_RECALL}
      </button>
    </div>
  )
}

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

function UserBubble({ m, onRemember }: { m: ChatMessage; onRemember?: (text: string) => void }) {
  const [show, setShow] = useState(false)
  const [showMem, setShowMem] = useState(false)
  const photos = m.files?.filter((f) => f.kind === 'photo') ?? []
  const docs = m.files?.filter((f) => f.kind === 'doc') ?? []
  const cleaned = [...new Set(photos.flatMap((p) => p.removed ?? []).map((r) => r.replace(/\s*\(.*$/, '')))]
  const faces = photos.reduce((n, p) => n + (p.faces ?? 0), 0)
  const covered = photos.reduce((n, p) => n + (p.covered ?? 0), 0)
  return (
    <div className="group/msg flex flex-col items-end">
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
      {!!m.memory?.length && (
        <div className="mt-1.5 flex w-full max-w-[85%] flex-col items-end gap-1.5">
          <Tooltip content="Your browser picked these notes from your memory for this message. The rest of your memory stayed here.">
            <button type="button" onClick={() => setShowMem((s) => !s)} className="inline-flex items-center gap-1 font-mono text-[10.5px] text-eth/85 hover:text-eth">
              <Brain className="size-3" />
              {m.memory.length} note{m.memory.length === 1 ? '' : 's'} from your memory went along · {showMem ? 'hide' : 'show'}
            </button>
          </Tooltip>
          {showMem && (
            <div className="space-y-1 rounded-lg border border-eth/20 px-3 py-2 font-mono text-[12px] leading-relaxed text-muted">
              {m.memory.map((n) => (
                <div key={n.id}>- {n.wire ?? n.text}</div>
              ))}
            </div>
          )}
        </div>
      )}
      {onRemember && m.content && (
        <button
          type="button"
          onClick={() => onRemember(m.content)}
          className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-faint opacity-0 transition-opacity hover:text-eth focus:opacity-100 group-hover/msg:opacity-100"
        >
          <Brain className="size-3" />
          remember
        </button>
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
  research,
  ghost,
  paranoid,
}: {
  onPick: (s: string) => void
  disabled: boolean
  web: boolean
  image: boolean
  shieldOn: boolean
  compare: boolean
  research: boolean
  ghost: boolean
  paranoid: boolean
}) {
  return (
    <div className={`mx-auto flex max-w-[640px] flex-col items-center px-4 text-center ${paranoid ? 'pt-[5vh]' : 'pt-[12vh]'}`}>
      {paranoid ? (
        <div className="mb-6 w-full max-w-[580px] rounded-xl border border-dashed border-warn/40 bg-warn/[0.04] px-5 py-4 text-left">
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.16em] text-warn">
            <ShieldAlert className="size-4" />
            PARANOID MODE
          </div>
          <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-soft">
            {PARANOID_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-ok">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-dim">
            Not a mixnet: Tor hides your IP, not every timing pattern, and the model still reads the shielded text.
          </p>
        </div>
      ) : ghost ? (
        <div className="mb-6 w-full max-w-[520px] rounded-xl border border-dashed border-eth/40 bg-eth/[0.05] px-5 py-4">
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.16em] text-eth">
            <Ghost className="size-4" />
            GHOST CHAT
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-soft">
            Nothing is saved: not the chat, not your files, not even in this browser. Leave the chat or close the tab and it&apos;s gone.
          </p>
        </div>
      ) : null}
      <LogoMark className="size-11 text-fg" />
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.03em] text-fg">
        {image ? 'Imagine privately.' : research ? 'Research privately.' : compare ? 'Compare privately.' : web ? 'Search privately.' : 'Ask privately.'}
      </h1>
      <p className="mt-3 max-w-[480px] text-[14.5px] leading-relaxed text-muted">
        {research
          ? 'Research is on: the model plans a few web searches, runs them in parallel and writes a report with numbered sources. Usually under a minute.'
          : compare
          ? 'Compare is on: every message goes to two models and both answers appear side by side, each with its own time and cost.'
          : image
          ? 'Image mode is on: describe a picture and it appears here. Reply to edit it. Images are saved only in this browser.'
          : web
            ? 'Web search is on: answers use live results and list their sources. Paid from your private balance like every request.'
            : ghost
              ? 'Paid from your private balance with a zero-knowledge proof, like every chat. This one leaves no history at all, not even here.'
              : 'Each chat gets its own short-lived key, paid from your private balance with a zero-knowledge proof. Your history stays in this browser.'}
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {(image ? IMAGE_SUGGESTIONS : research ? RESEARCH_SUGGESTIONS : web ? WEB_SUGGESTIONS : SUGGESTIONS).map((s) => (
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
      {shieldOn && !paranoid && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-ok/80">
          <ShieldCheck className="size-3" />
          Prompt Shield is on: names, emails, numbers and addresses are swapped for placeholders before sending
        </p>
      )}
      {!image && !paranoid && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-dim">
          <Paperclip className="size-3" />
          Attach PDFs, text files or photos: opened in your browser, photos lose their GPS location, faces and personal details are hidden
        </p>
      )}
      {!paranoid && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-dim">
          <Mic className="size-3" />
          Talk instead of typing: Whisper turns speech into text in your browser, your voice is never sent
        </p>
      )}
      {!image && !ghost && (
        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-dim">
          <Brain className="size-3" />
          Private Memory: notes you save stay in this browser, only the ones that fit a message go along
        </p>
      )}
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

/** The searches behind a research report: what was asked, how far each got, how many sources. */
function ResearchTrail({ steps, streaming }: { steps: ResearchStep[]; streaming: boolean }) {
  const [open, setOpen] = useState(true)
  const sources = steps.reduce((n, s) => n + s.sources, 0)
  if (!steps.length) return null
  return (
    <div className="mb-3 rounded-lg border border-line-2 bg-panel/50 px-3.5 py-2.5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 font-mono text-[10.5px] tracking-[0.12em] text-dim hover:text-soft">
        <Telescope className="size-3.5 text-eth" />
        RESEARCH · {steps.length} SEARCHES · {sources} SOURCES
        <ChevronDown className={`ml-auto size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="inline-flex size-4 shrink-0 items-center justify-center">
                {s.status === 'searching' || (s.status === 'pending' && streaming) ? (
                  <Spinner className="size-3" />
                ) : s.status === 'done' ? (
                  <Check className="size-3.5 text-ok" />
                ) : s.status === 'error' ? (
                  <X className="size-3.5 text-bad/80" />
                ) : (
                  <span className="size-1.5 rounded-full bg-faint" />
                )}
              </span>
              <span className="min-w-0 truncate text-soft">{s.q}</span>
              <span className="ml-auto shrink-0 font-mono text-[10.5px] text-dim">
                {s.status === 'done' ? `${s.sources} source${s.sources === 1 ? '' : 's'}` : s.status === 'searching' ? 'searching…' : s.status === 'error' ? 'no result' : 'waiting'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Messages({
  conv,
  phase,
  streamingId,
  onRetry,
  onShare,
  onRemember,
  onOutbox,
}: {
  conv: Conversation
  phase: string
  streamingId: string | null
  onRetry: () => void
  onShare: (item: ShareItem) => void
  onOutbox: () => void
  /** not in ghost chats: they never add to memory */
  onRemember?: (text: string) => void
}) {
  const wide = conv.messages.some((m) => m.alt)
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-[1120px]' : 'max-w-[780px]'} space-y-7 px-4 py-8 sm:px-6`}>
      {conv.messages.map((m, i) =>
        m.role === 'user' ? (
          <UserBubble key={m.id} m={m} onRemember={onRemember} />
        ) : m.alt ? (
          <CompareRow key={m.id} m={m} phase={phase} streaming={streamingId === m.id} onRetry={i === conv.messages.length - 1 ? onRetry : undefined} />
        ) : (
          <div key={m.id} className="flex gap-3.5">
            <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-line-2 text-soft">
              <LogoMark className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              {m.research && <ResearchTrail steps={m.research.steps} streaming={streamingId === m.id} />}
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
                  {m.research && (
                    <span className="inline-flex items-center gap-1">
                      <Telescope className="size-3" />
                      research
                    </span>
                  )}
                  {m.image && (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-3" />
                      image
                    </span>
                  )}
                  {m.delayMs != null && (
                    <Tooltip content="Paranoid mode held this request back for a random moment, so it didn't leave the instant you hit send.">
                      <span className="text-warn/80">delayed {(m.delayMs / 1000).toFixed(1)}s</span>
                    </Tooltip>
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
                  <Tooltip content="See exactly what this page sent: the request, its size, and the placeholders in place of your details.">
                    <button type="button" onClick={onOutbox} className="inline-flex items-center gap-1 text-dim transition-colors hover:text-fg">
                      <ArrowUpFromLine className="size-3" />
                      what was sent
                    </button>
                  </Tooltip>
                  {!!m.images?.length && i === conv.messages.length - 1 && <span className="text-faint">reply to edit this image</span>}
                  {!m.image && m.content && (
                    <Tooltip content="Share this answer with a link that carries it inside. Nothing is uploaded.">
                      <button
                        type="button"
                        onClick={() => {
                          const q = conv.messages[i - 1]
                          onShare({ q: q?.content ?? '', qWire: q?.wire, a: m.content, aWire: m.wire, model: m.model ?? conv.model, ts: m.ts, sources: m.sources })
                        }}
                        className="inline-flex items-center gap-1 text-dim transition-colors hover:text-fg"
                      >
                        <Share2 className="size-3" />
                        share
                      </button>
                    </Tooltip>
                  )}
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
  const { list, upsert, update, merge, remove, clear } = useConversations()
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
  const [backup, setBackup] = useState<'export' | 'import' | null>(null)
  const [autoDays, setAutoDays] = useState(loadAutoDelete)
  const [crowdOpen, setCrowdOpen] = useState(false)
  const [shareItem, setShareItem] = useState<ShareItem | null>(null)
  const [outboxOpen, setOutboxOpen] = useState(false)
  const memory = useMemory()
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [memoryPrefill, setMemoryPrefill] = useState('')
  const [memModel, setMemModel] = useState<ModelStatus>({ status: 'off', progress: 0 })
  const [memSkip, setMemSkip] = useState<Set<string>>(() => new Set())
  const [memFound, setMemFound] = useState<{ text: string; list: Recalled[] }>({ text: '', list: [] })
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
  /** paranoid mode forces the shield on, whatever the switch says */
  const shieldOn = shieldCfg.on || !!conv.paranoid
  const [paranoidNote, setParanoidNote] = useState<string | null>(null)
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
  const aiWanted = (shieldOn && shieldCfg.ai) || !!conv.paranoid
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
    if (!shieldOn || !input.trim()) return { hits: [], aiKeys: new Set<string>() }
    const found = detect(input, shieldCfg.words)
    if (!aiCurrent) return { hits: found, aiKeys: new Set<string>() }
    // pattern hits win ties, so only what the patterns missed is marked "AI"
    const merged = mergeHits(found, aiHits.hits)
    const fromAi = new Set(aiHits.hits)
    return { hits: merged, aiKeys: new Set(merged.filter((h) => fromAi.has(h)).map((h) => `${h.start}:${h.end}`)) }
  }, [input, shieldCfg, shieldOn, aiCurrent, aiHits])

  // Private Memory: load the in-browser model once there are notes, then pick notes for what is typed
  const memWanted = memory.on && memory.notes.length > 0
  useEffect(() => {
    if (!memWanted) return
    let alive = true
    setMemModel((s) => (s.status === 'ready' ? s : { status: 'loading', progress: 0 }))
    loadMemoryModel((p) => alive && setMemModel({ status: 'loading', progress: p }))
      .then(() => alive && setMemModel({ status: 'ready', progress: 1 }))
      .catch(() => alive && setMemModel({ status: 'error', progress: 0 }))
    return () => {
      alive = false
    }
  }, [memWanted])
  /** memory is left out of web search, research and images, so a note never becomes a search query */
  const memApplies = memWanted && memModel.status === 'ready' && !conv.image && !conv.web && !conv.research && !conv.paranoid
  const memUsed = useMemo(() => new Set(conv.messages.flatMap((m) => m.memory?.map((n) => n.id) ?? [])), [conv.messages])
  const memCandidates = useMemo(() => memory.notes.filter((n) => !memUsed.has(n.id)), [memory.notes, memUsed])
  useEffect(() => {
    if (!memApplies || !input.trim()) return
    let alive = true
    const t = setTimeout(() => {
      void recall(input, memCandidates)
        .then((list) => alive && setMemFound({ text: input, list }))
        .catch(() => {})
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [input, memApplies, memCandidates])
  const memPreview = memApplies && input.trim() && memFound.text === input ? memFound.list : null

  const rememberText = useCallback((text: string) => {
    setMemoryPrefill(text)
    setMemoryOpen(true)
  }, [])

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
      shieldOn
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
    if (conv.paranoid) return
    const incoming = [...list]
    if (!incoming.length) return
    const room = Math.max(0, MAX_FILES - attachedRef.current.length)
    const take = incoming.slice(0, room)
    const items: Attachment[] = take.map((f) => ({
      key: randId('file', 8),
      name: f.name || 'pasted image',
      kind: fileKind(f) ?? 'doc',
      status: 'reading',
      ...(shieldOn ? {} : { cover: false }),
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
      const compare = !!target.compare && !target.image && !target.research
      const model2 = target.model2 ?? secondModel(target.model)
      const reply = newMessage('assistant', '', {
        model: target.image ? imageModel : target.model,
        ...(target.image ? { image: true } : target.research ? { research: { steps: [] } } : target.web ? { web: true } : {}),
        ...(compare ? { alt: { model: model2, content: '' } } : {}),
      })
      const withReply = { ...target, messages: [...target.messages, reply], updatedAt: Date.now() }
      upsert(withReply)
      setActiveId(withReply.id)
      setStreamingId(reply.id)
      setPhase('')
      const ctrl = new AbortController()
      abort.current = ctrl
      let t0 = performance.now()
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
        if (target.paranoid) {
          // Tor only: checked again right before the request
          const c = await recheckConnection()
          if (c.status !== 'done' || !c.tor) {
            patch({ error: torProblem(c) })
            return
          }
          // a random 2–8 s wait, so the request doesn't leave the moment you hit send
          const delayMs = 2000 + (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * 6000
          const until = Date.now() + delayMs
          while (Date.now() < until) {
            if (ctrl.signal.aborted) {
              patch({ error: 'Stopped during the random delay. Nothing was sent.' })
              return
            }
            setPhase(`Random delay · sending in ${Math.ceil((until - Date.now()) / 1000)}s`)
            await sleep(Math.min(250, until - Date.now()))
          }
          patch({ delayMs: Math.round(delayMs) })
          t0 = performance.now()
        }
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
          const id = fileId('img', target.ghost)
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
        if (target.research) {
          const history = await toWire(target.messages, 'a', canSee(target.model))
          const patchResearch = (fn: (steps: ResearchStep[]) => ResearchStep[]) =>
            update(withReply.id, (c) => ({
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) => (m.id === reply.id ? { ...m, research: { steps: fn(m.research?.steps ?? []) } } : m)),
            }))
          const rh: ResearchHooks = {
            signal: ctrl.signal,
            onPhase: (p: string) => setPhase(p),
            shield: shielded,
            onPlan: (qs) => patchResearch(() => qs.map((q) => ({ q, status: 'pending', sources: 0 }))),
            onStep: (i, st) => patchResearch((steps) => steps.map((s, k) => (k === i ? { ...s, ...st } : s))),
            onDelta: hooks.onDelta,
            onSources: (list) => patch({ sources: list }),
            onCost: (usd) => patch({ costUsd: usd }),
          }
          if (client) await researchLive(client, withReply.id, target.model, history, rh)
          else {
            await researchDemo(history, rh)
            spend('web-search', 0.08, randHex(32), `research · ${modelLabel(target.model)}`)
          }
          patch({ ms: performance.now() - t0 })
          return
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
    const skipNow = conv.paranoid ? NO_SKIP : skip
    const files = conv.image ? [] : readyFiles
    if ((!content && !files.length) || sending || preparing || !canSend || stillReading || blind.length) return
    setPreparing(true)
    try {
      // paranoid mode: nothing leaves unless this browser is on Tor and AI Shield is ready
      if (conv.paranoid) {
        const c = await recheckConnection()
        if (c.status !== 'done' || !c.tor) {
          setParanoidNote(torProblem(c))
          return
        }
        if (ai.status !== 'ready') {
          setParanoidNote(ai.status === 'error' ? 'AI Shield could not load, so nothing was sent. Reload the page to try again.' : 'AI Shield is still loading, so nothing was sent yet.')
          return
        }
        setParanoidNote(null)
      }
      // Prompt Shield: swap personal details for placeholders before anything leaves the browser
      let map = conv.shieldMap ?? {}
      let extra: Partial<ChatMessage> = {}
      let hidden = 0
      const shieldText = async (s: string) => {
        let found = detect(s, shieldCfg.words)
        if (aiWanted && ai.status === 'ready') found = mergeHits(found, await detectAi(s).catch(() => []))
        const r = shield(s, found, map, skipNow)
        map = r.map
        hidden += r.used.length
        return r
      }
      if (shieldOn && content) {
        const s = await shieldText(content)
        if (s.used.length) extra = { wire: s.text }
      }
      // files: stored in this browser; documents also as the shielded text the model will see
      const stored: ChatFile[] = []
      for (const a of files) {
        const f = a.file!
        if (f.kind === 'photo') {
          const id = fileId('pic', conv.ghost)
          const blur = a.blur !== false && f.faces > 0
          const cover = a.cover !== false && f.covered.length > 0
          await putImage(id, photoUrl(f, blur, cover))
          stored.push({ id, kind: 'photo', name: f.name, mime: f.mime, removed: f.removed, faces: blur ? f.faces : 0, covered: cover ? f.covered.length : 0 })
          continue
        }
        const id = fileId('doc', conv.ghost)
        const block = docBlock(f)
        await putText(id, block)
        let shielded = 0
        if (shieldOn) {
          const s = await shieldText(block)
          if (s.used.length) {
            await putText(`${id}.wire`, s.text)
            shielded = s.used.length
          }
        }
        stored.push({ id, kind: 'doc', name: f.name, pages: f.pages, chars: f.text.length, truncated: f.truncated, removed: f.removed, shielded })
      }
      if (hidden) extra = { ...extra, shielded: hidden }
      // Private Memory: the notes that fit this message, picked here; the rest never leave the browser
      if (memApplies && content) {
        const picked = (await recall(content, memCandidates).catch(() => [])).filter((r) => !memSkip.has(r.note.id))
        const notes: NonNullable<ChatMessage['memory']> = []
        for (const r of picked) {
          let wire: string | undefined
          if (shieldOn) {
            let found = detect(r.note.text, shieldCfg.words)
            if (aiWanted && ai.status === 'ready') found = mergeHits(found, await detectAi(r.note.text).catch(() => []))
            const s = shield(r.note.text, found, map, skipNow)
            map = s.map
            if (s.used.length) wire = s.text
          }
          notes.push({ id: r.note.id, text: r.note.text, ...(wire ? { wire } : {}) })
        }
        if (notes.length) extra = { ...extra, memory: notes }
      }
      const user = newMessage('user', content, { ...extra, ...(stored.length ? { files: stored } : {}) })
      const base = conv.messages.length ? conv : { ...conv, title: titleFrom(content || stored[0]?.name || '') }
      const next = { ...base, shieldMap: map, messages: [...base.messages, user], updatedAt: Date.now() }
      setInput('')
      setSkip(new Set())
      setMemSkip(new Set())
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

  /** A ghost chat is erased the moment you leave it: messages, files, images. */
  const leaveGhost = (nextId?: string) => {
    if (!conv.ghost || nextId === conv.id) return
    if (conv.messages.length) {
      void deleteImages(imageIds(conv))
      remove(conv.id)
      clearOutbox()
    }
  }

  const startGhost = () => {
    if (sending) return
    leaveGhost()
    setDraft({ ...newConversation(conv.model), ghost: true })
    setActiveId('')
    setDrawer(false)
    setTimeout(() => textarea.current?.focus(), 50)
  }

  const startParanoid = () => {
    if (sending) return
    leaveGhost()
    setDraft({ ...newConversation(conv.model), ghost: true, paranoid: true })
    setAttached([])
    setParanoidNote(null)
    setActiveId('')
    setDrawer(false)
    void checkConnection()
    setTimeout(() => textarea.current?.focus(), 50)
  }

  const startNew = () => {
    if (sending) return
    leaveGhost()
    setDraft({ ...newConversation(conv.model), web: !!conv.web, image: !!conv.image, imageModel: conv.imageModel, aspect: conv.aspect })
    setActiveId('')
    setDrawer(false)
    setTimeout(() => textarea.current?.focus(), 50)
  }

  const select = (id: string) => {
    if (sending) return
    leaveGhost(id)
    setActiveId(id)
    setDrawer(false)
  }

  // auto-delete: chats untouched for longer than the chosen time leave this browser, files too
  const listRef = useRef(list)
  listRef.current = list
  const busyRef = useRef<{ sending: boolean; id: string }>({ sending, id: conv.id })
  busyRef.current = { sending, id: conv.id }
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, String(autoDays))
    } catch {
      /* setting stays for this tab */
    }
    if (!autoDays) return
    const purge = () => {
      const cutoff = Date.now() - autoDays * 86_400_000
      const old = listRef.current.filter((c) => !c.ghost && c.updatedAt < cutoff && !(busyRef.current.sending && busyRef.current.id === c.id))
      for (const c of old) {
        void deleteImages(imageIds(c))
        remove(c.id)
      }
      if (old.some((c) => c.id === busyRef.current.id)) setActiveId('')
    }
    purge()
    const t = setInterval(purge, 10 * 60_000)
    return () => clearInterval(t)
  }, [autoDays, remove])

  /** changes this chat's settings (stored once it has messages, else on the draft) */
  const setConv = (fields: Partial<Conversation>) => {
    if (conv.messages.length) update(conv.id, (c) => ({ ...c, ...fields }))
    else setDraft((d) => ({ ...d, ...fields }))
  }

  const setModel = (model: string) => setConv(conv.image ? { imageModel: model } : { model })

  const toggleWeb = () => {
    if (conv.paranoid) return
    setConv({ web: !conv.web, image: false, research: false })
    textarea.current?.focus()
  }

  const toggleImage = () => {
    if (conv.paranoid) return
    if (!conv.image) setAttached([])
    setConv({ image: !conv.image, web: false, compare: false, research: false })
    textarea.current?.focus()
  }

  const toggleCompare = () => {
    if (conv.paranoid) return
    setConv({ compare: !conv.compare, image: false, research: false, model2: conv.model2 ?? secondModel(conv.model) })
    textarea.current?.focus()
  }

  const toggleResearch = () => {
    if (conv.paranoid) return
    if (!conv.research) setAttached([])
    setConv({ research: !conv.research, web: false, image: false, compare: false })
    textarea.current?.focus()
  }

  const editing = conv.image && !!editTarget(conv.messages)

  const keyOpen = IS_LIVE ? !!live?.pendingRequest || !!keyOwner.current : false

  /** Puts a decrypted backup into this browser: new chats are added, existing ones keep the newer copy. */
  const restoreBackup = async (c: BackupContents): Promise<RestoreResult> => {
    const have = new Map(list.map((x) => [x.id, x]))
    let added = 0
    let newer = 0
    let kept = 0
    for (const conv of c.conversations) {
      const h = have.get(conv.id)
      if (!h) added++
      else if (h.updatedAt < conv.updatedAt) newer++
      else kept++
    }
    let files = 0
    for (const [id, blob] of c.files) {
      if (await getImageBlob(id)) continue
      await putBlob(id, blob)
      if (!id.endsWith('.wire')) files++
    }
    merge(c.conversations)
    if (c.shieldWords.length) setShieldCfg((s) => ({ ...s, words: [...new Set([...s.words, ...c.shieldWords])] }))
    const notes = memory.merge(c.memory)
    return { added, newer, kept, files, notes }
  }

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
      onBackup={(tab) => {
        if (sending) return
        setDrawer(false)
        setBackup(tab)
      }}
      autoDays={autoDays}
      onAutoDays={setAutoDays}
      onCrowd={() => {
        setDrawer(false)
        setCrowdOpen(true)
      }}
      memory={{ on: memory.on, count: memory.notes.length }}
      onMemory={() => {
        setDrawer(false)
        setMemoryPrefill('')
        setMemoryOpen(true)
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
            <OutboxButton onClick={() => setOutboxOpen(true)} />
            <Tooltip
              content={
                conv.paranoid
                  ? 'You are in paranoid mode. Click to leave it; the chat is erased.'
                  : 'Paranoid mode: Tor only, nothing saved, AI Shield always on, a random delay before sending, memory, web and files off.'
              }
            >
              <button
                type="button"
                onClick={conv.paranoid ? startNew : startParanoid}
                disabled={sending}
                aria-pressed={!!conv.paranoid}
                aria-label={conv.paranoid ? 'Leave paranoid mode' : 'Start a paranoid chat'}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] tracking-[0.14em] transition-colors disabled:opacity-50 ${
                  conv.paranoid ? 'border-dashed border-warn/50 bg-warn/10 text-warn' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                }`}
              >
                <ShieldAlert className="size-3.5" />
                <span className="hidden sm:inline">{conv.paranoid ? 'PARANOID · LEAVE' : 'PARANOID'}</span>
              </button>
            </Tooltip>
            {!conv.paranoid && (
            <Tooltip
              content={
                conv.ghost
                  ? 'You are in a ghost chat: nothing is saved, not even in this browser. Click to leave it; it is erased.'
                  : 'Start a ghost chat: nothing is saved, files stay in memory only, and it is erased when you leave it.'
              }
            >
              <button
                type="button"
                onClick={conv.ghost ? startNew : startGhost}
                disabled={sending}
                aria-pressed={!!conv.ghost}
                aria-label={conv.ghost ? 'Leave ghost chat' : 'Start a ghost chat'}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] tracking-[0.14em] transition-colors disabled:opacity-50 ${
                  conv.ghost ? 'border-dashed border-eth/50 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                }`}
              >
                <Ghost className="size-3.5" />
                <span className="hidden sm:inline">{conv.ghost ? 'GHOST · LEAVE' : 'GHOST'}</span>
              </button>
            </Tooltip>
            )}
            <a href={IS_LIVE ? '/chat?demo' : '/chat'} className={`hidden rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] sm:inline-flex ${IS_LIVE ? 'border-ok/30 text-ok/90' : 'border-warn/30 text-warn/90'}`}>
              {IS_LIVE ? 'LIVE' : 'DEMO'}
            </a>
            <WalletButton />
          </div>
        </div>

        {/* conversation */}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {conv.messages.length === 0 ? <EmptyState onPick={send} disabled={!canSend} web={!!conv.web} image={!!conv.image} shieldOn={shieldOn} compare={!!conv.compare && !conv.image} research={!!conv.research} ghost={!!conv.ghost} paranoid={!!conv.paranoid} /> : <Messages conv={conv} phase={phase} streamingId={streamingId} onRetry={retry} onShare={setShareItem} onRemember={conv.ghost ? undefined : rememberText} onOutbox={() => setOutboxOpen(true)} />}
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
            {conv.paranoid && <ParanoidBar note={paranoidNote} ai={ai} />}
            {conv.ghost && !conv.paranoid && conv.messages.length > 0 && (
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[10.5px] text-eth/90">
                <Ghost className="size-3.5" />
                GHOST CHAT · not saved anywhere · leaving it or closing the tab erases it
              </div>
            )}
            {conv.research && (
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] text-dim">
                <span className="inline-flex items-center gap-1 tracking-[0.12em] text-eth">
                  <Telescope className="size-3.5" />
                  RESEARCH
                </span>
                <span>3–5 web searches + a cited report · usually under a minute · a few cents to ~30¢ · placeholders never go into a search</span>
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
            {memPreview && (
              <MemoryBar
                list={memPreview}
                skip={memSkip}
                onToggle={(id) =>
                  setMemSkip((s) => {
                    const n = new Set(s)
                    if (n.has(id)) n.delete(id)
                    else n.add(id)
                    return n
                  })
                }
                onManage={() => rememberText('')}
              />
            )}
            {shieldOn && (input.trim() || fileHits.length > 0) && (
              <ShieldBar
                files={fileHits}
                hits={hits}
                skip={conv.paranoid ? NO_SKIP : skip}
                onToggle={(v) =>
                  !conv.paranoid &&
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
                  disabled={sending || conv.image || !!conv.paranoid || attached.length >= MAX_FILES}
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
                  disabled={sending || !!conv.paranoid}
                  aria-pressed={!!conv.web}
                  aria-label="Web search"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.web ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <Globe className="size-3.5" />
                  <span className={conv.web ? 'hidden sm:inline' : 'hidden'}>WEB</span>
                </button>
              </Tooltip>
              <Tooltip
                content={
                  conv.research
                    ? 'Research is on: the model plans 3 to 5 web searches, runs them in parallel and writes a cited report. Each search and the report are paid from your private balance; usually a few cents to about 30¢.'
                    : 'Deep research: planned web searches and a report with numbered sources.'
                }
              >
                <button
                  type="button"
                  onClick={toggleResearch}
                  disabled={sending || !!conv.paranoid}
                  aria-pressed={!!conv.research}
                  aria-label="Deep research"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.research ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <Telescope className="size-3.5" />
                  <span className={conv.research ? 'hidden sm:inline' : 'hidden'}>RESEARCH</span>
                </button>
              </Tooltip>
              <Tooltip content={conv.image ? 'Image mode is on: each message makes or edits a picture. Images stay in this browser.' : 'Turn on image mode to create pictures privately.'}>
                <button
                  type="button"
                  onClick={toggleImage}
                  disabled={sending || !!conv.paranoid}
                  aria-pressed={!!conv.image}
                  aria-label="Image mode"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.image ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <ImageIcon className="size-3.5" />
                  <span className={conv.image ? 'hidden sm:inline' : 'hidden'}>IMAGE</span>
                </button>
              </Tooltip>
              <Tooltip
                content={
                  shieldOn
                    ? 'Prompt Shield is on: names, emails, phone numbers, addresses, wallets and keys are swapped for placeholders in your browser before sending.'
                    : 'Prompt Shield is off: messages are sent exactly as written.'
                }
              >
                <button
                  type="button"
                  onClick={() => setShieldCfg((c) => ({ ...c, on: !c.on }))}
                  disabled={!!conv.paranoid}
                  aria-pressed={shieldOn}
                  aria-label="Prompt Shield"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors ${
                    shieldOn ? 'border-ok/35 bg-ok/[0.08] text-ok/90' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                  <span className={shieldOn ? 'hidden sm:inline' : 'hidden'}>SHIELD</span>
                </button>
              </Tooltip>
              <Tooltip content={conv.compare ? 'Compare is on: two models answer every message, side by side. Each answer is paid separately.' : 'Ask two models at once and compare their answers.'}>
                <button
                  type="button"
                  onClick={toggleCompare}
                  disabled={sending || !!conv.paranoid}
                  aria-pressed={!!conv.compare}
                  aria-label="Compare two models"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors disabled:opacity-50 ${
                    conv.compare ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
                  }`}
                >
                  <Columns2 className="size-3.5" />
                  <span className={conv.compare ? 'hidden sm:inline' : 'hidden'}>COMPARE</span>
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
                      : conv.research
                        ? 'Ask a research question…'
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
            <PrivacyLine web={!!conv.web || !!conv.research} image={!!conv.image} shieldOn={shieldOn} />
          </div>
        </div>
      </main>
      <CrowdDialog open={crowdOpen} onClose={() => setCrowdOpen(false)} />
      <ShareDialog item={shareItem} onClose={() => setShareItem(null)} />
      <OutboxDialog open={outboxOpen} onClose={() => setOutboxOpen(false)} />
      <MemoryDialog
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        on={memory.on}
        notes={memory.notes}
        model={memModel}
        prefill={memoryPrefill}
        onOn={memory.setOn}
        onAdd={memory.add}
        onRemove={memory.remove}
        onClear={memory.clear}
      />
      <BackupDialog
        open={backup !== null}
        initialTab={backup ?? 'export'}
        onClose={() => setBackup(null)}
        conversations={list.filter((c) => c.messages.length && !c.ghost)}
        shieldWords={shieldCfg.words}
        memory={memory.notes}
        onRestore={restoreBackup}
      />
    </div>
  )
}

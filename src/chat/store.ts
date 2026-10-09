import { useCallback, useEffect, useState } from 'react'
import { IS_LIVE } from '../config/mode'
import { randId } from '../lib/random'
import type { ShieldMap } from './shield'

/** Conversations live only in this browser. Nothing is stored on a server. Demo chats are kept apart. */
const KEY = IS_LIVE ? 'null.chat.v1' : 'null.chat.demo.v1'

/**
 * A file attached to a user message. The content lives in IndexedDB under `id` (photo: the
 * cleaned image; document: its text, plus `${id}.wire` with the shielded text the model saw).
 */
export interface ChatFile {
  id: string
  kind: 'doc' | 'photo'
  name: string
  mime?: string
  pages?: number
  chars?: number
  truncated?: boolean
  /** what stayed behind: photo metadata, document details */
  removed?: string[]
  /** details the shield replaced in this document */
  shielded?: number
  /** faces blurred in this photo before it was sent */
  faces?: number
  /** personal details covered in this photo's text before it was sent */
  covered?: number
}

/** The second model's answer to the same message, in compare mode. */
export interface AltAnswer {
  model: string
  content: string
  wire?: string
  ms?: number
  costUsd?: number
  error?: string
  sources?: { url: string; title: string }[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  model?: string
  ms?: number
  error?: string
  /** answered with live web search */
  web?: boolean
  sources?: { url: string; title: string }[]
  /** an image answer; the pictures themselves live in IndexedDB (see images.ts) */
  image?: boolean
  images?: { id: string; aspect: string; mime: string }[]
  /** what the provider charged for this answer, when it reports it (USD) */
  costUsd?: number
  /** Prompt Shield: the text as the model saw (user) or wrote it (assistant), with placeholders */
  wire?: string
  /** how many details the shield hid in this user message */
  shielded?: number
  /** compare mode: the second model's answer, shown next to this one */
  alt?: AltAnswer
  /** documents and photos attached to this user message */
  files?: ChatFile[]
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  /** ETH charged so far (settled usage) */
  spentEth: number
  /** web search on for this chat's next messages */
  web?: boolean
  /** image mode: messages generate (or edit) images */
  image?: boolean
  imageModel?: string
  aspect?: string
  /** Prompt Shield: real detail → placeholder, so a detail keeps its tag for the whole chat */
  shieldMap?: ShieldMap
  /** compare mode: every message also goes to model2 */
  compare?: boolean
  model2?: string
}

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as Conversation[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function newConversation(model: string): Conversation {
  const now = Date.now()
  return { id: randId('chat', 10), title: 'New chat', model, messages: [], createdAt: now, updatedAt: now, spentEth: 0 }
}

export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 48 ? `${t.slice(0, 47)}…` : t || 'New chat'
}

export function useConversations() {
  const [list, setList] = useState<Conversation[]>(load)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        // keep only chats that have messages; cap the history
        localStorage.setItem(KEY, JSON.stringify(list.filter((c) => c.messages.length).slice(0, 100)))
      } catch {
        /* storage full or blocked: chats stay in memory for this tab */
      }
    }, 250)
    return () => clearTimeout(t)
  }, [list])

  const upsert = useCallback((c: Conversation) => {
    setList((l) => [c, ...l.filter((x) => x.id !== c.id)].sort((a, b) => b.updatedAt - a.updatedAt))
  }, [])

  const update = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setList((l) => l.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const remove = useCallback((id: string) => setList((l) => l.filter((c) => c.id !== id)), [])
  const clear = useCallback(() => setList([]), [])

  return { list, upsert, update, remove, clear }
}

export const newMessage = (role: ChatMessage['role'], content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: randId('msg', 10),
  role,
  content,
  ts: Date.now(),
  ...extra,
})

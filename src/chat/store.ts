import { useCallback, useEffect, useState } from 'react'
import { IS_LIVE } from '../config/mode'
import { randId } from '../lib/random'

/** Conversations live only in this browser. Nothing is stored on a server. Demo chats are kept apart. */
const KEY = IS_LIVE ? 'null.chat.v1' : 'null.chat.demo.v1'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  model?: string
  ms?: number
  error?: string
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

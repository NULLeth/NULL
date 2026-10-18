import { Brain, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { findWallet } from './walletGuard'
import { fitLevel, MAX_NOTE_CHARS, MAX_RECALL, MEMORY_MODEL_MB, recall, type MemoryNote, type Recalled } from './memory'

export type ModelStatus = { status: 'off' | 'loading' | 'ready' | 'error'; progress: number }

const FIT = { 1: '●○○ fits', 2: '●●○ good', 3: '●●● strong' } as const

const day = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** Private Memory: the notes, a switch, and a way to see which notes a question would take along. */
export function MemoryDialog({
  open,
  onClose,
  on,
  notes,
  model,
  prefill,
  onOn,
  onAdd,
  onRemove,
  onClear,
}: {
  open: boolean
  onClose: () => void
  on: boolean
  notes: MemoryNote[]
  model: ModelStatus
  /** text to put in the "add a note" box when the dialog opens (from "remember") */
  prefill: string
  onOn: (on: boolean) => void
  onAdd: (text: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const [text, setText] = useState('')
  const [probe, setProbe] = useState('')
  const [found, setFound] = useState<{ q: string; list: Recalled[] } | null>(null)

  useEffect(() => {
    if (!open) return
    setText(prefill)
    setProbe('')
    setFound(null)
  }, [open, prefill])

  // which notes would go along with the question typed into the test box
  useEffect(() => {
    if (!probe.trim() || model.status !== 'ready' || !notes.length) return
    let alive = true
    const t = setTimeout(() => {
      void recall(probe, notes)
        .then((list) => alive && setFound({ q: probe, list }))
        .catch(() => {})
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [probe, notes, model.status])

  const guarded = findWallet(text).length > 0
  const add = () => {
    if (!text.trim() || guarded) return
    onAdd(text)
    setText('')
  }

  const status =
    model.status === 'ready'
      ? 'ready'
      : model.status === 'loading'
        ? `downloading ${Math.round(model.progress * 100)}%`
        : model.status === 'error'
          ? 'could not load'
          : notes.length
            ? 'off'
            : 'loads with your first note'

  return (
    <Modal open={open} onClose={onClose} eyebrow="PRIVACY · MEMORY" title="Private Memory" width="md">
      <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Notes NULL can use in your chats, like &ldquo;I&apos;m vegetarian&rdquo; or &ldquo;I work night shifts&rdquo;. They are saved <span className="text-fg">only in this browser</span>.
          Before you send a message, a small AI here picks the notes that fit it, up to {MAX_RECALL}. Only those go along, through Prompt Shield like the rest of your
          message. The others never leave this browser.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-2 bg-bg/40 px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-soft">
            <input type="checkbox" checked={on} onChange={(e) => onOn(e.target.checked)} className="accent-[#43d392]" />
            Use memory in my chats
          </label>
          <span className={`font-mono text-[10.5px] ${model.status === 'ready' ? 'text-ok/85' : model.status === 'error' ? 'text-bad/90' : 'text-dim'}`}>
            memory model · {MEMORY_MODEL_MB} MB · {status}
          </span>
        </div>

        <div>
          <div className="mb-1.5 font-mono text-[10.5px] tracking-[0.14em] text-dim">ADD A NOTE</div>
          <div className="flex items-start gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_NOTE_CHARS))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  add()
                }
              }}
              rows={2}
              placeholder="Something NULL should know, in one or two sentences"
              className="min-h-[44px] flex-1 resize-none rounded-md border border-line-2 bg-bg/60 px-3 py-2 text-[13.5px] leading-relaxed text-fg outline-none placeholder:text-faint focus:border-line-3"
            />
            <Button variant="primary" onClick={add} disabled={!text.trim() || guarded} icon={<Brain className="size-3.5" />}>
              Remember
            </Button>
          </div>
          {guarded && <p className="mt-1.5 font-mono text-[11px] text-bad/90">Wallet Guard: a seed phrase or private key can&apos;t be saved, not even here.</p>}
        </div>

        {notes.length > 0 && (
          <div>
            <div className="mb-1.5 font-mono text-[10.5px] tracking-[0.14em] text-dim">TRY A QUESTION: WHICH NOTES WOULD GO ALONG?</div>
            <input
              value={probe}
              onChange={(e) => setProbe(e.target.value)}
              placeholder="e.g. Plan three dinners for this week"
              className="h-9 w-full rounded-md border border-line-2 bg-bg/60 px-3 text-[13.5px] text-fg outline-none placeholder:text-faint focus:border-line-3"
            />
            {probe.trim() && (
              <div className="mt-1.5 font-mono text-[11px] leading-relaxed">
                {model.status !== 'ready' ? (
                  <span className="inline-flex items-center gap-1.5 text-dim">
                    <Spinner className="size-3" /> the memory model is loading…
                  </span>
                ) : !found || found.q !== probe ? (
                  <span className="text-dim">checking…</span>
                ) : found.list.length ? (
                  found.list.map((r) => (
                    <div key={r.note.id} className="flex items-baseline gap-2">
                      <span className="w-[74px] shrink-0 text-eth">{FIT[fitLevel(r.fit)]}</span>
                      <span className="text-soft">{r.note.text}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-dim">no note fits: nothing from your memory would be sent</span>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] tracking-[0.14em] text-dim">
            <span>
              YOUR NOTES · {notes.length}
            </span>
            {notes.length > 1 && (
              <button type="button" onClick={onClear} className="inline-flex items-center gap-1 tracking-normal text-faint hover:text-bad">
                <Trash2 className="size-3" /> forget all
              </button>
            )}
          </div>
          {notes.length ? (
            <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
              {notes.map((n) => (
                <div key={n.id} className="group flex items-start gap-2 rounded-md border border-line-2 bg-panel/60 px-3 py-2">
                  <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-soft">{n.text}</span>
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-faint">{day(n.ts)}</span>
                  <button type="button" onClick={() => onRemove(n.id)} aria-label="Forget this note" className="mt-0.5 shrink-0 text-dim hover:text-bad">
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-line-2 px-3 py-4 text-center text-[12.5px] text-dim">
              No notes yet. Add one here, or tap <span className="font-mono text-soft">remember</span> under one of your messages.
            </p>
          )}
        </div>

        <p className="font-mono text-[10.5px] leading-relaxed text-dim">
          Not used in web search, research or image mode, so a note never ends up in a search query. Ghost chats can use memory but never add to it. Your notes go
          into your encrypted backup too. The {MEMORY_MODEL_MB} MB model downloads once from nullzk.com and runs in your browser.
        </p>
      </div>
    </Modal>
  )
}

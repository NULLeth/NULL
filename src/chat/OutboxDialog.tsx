import { ChevronDown, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../components/ui/Modal'
import { clearOutbox, useOutbox, type OutboxEntry } from './outbox'

const time = (ts: number) => new Date(ts).toLocaleTimeString('en-GB', { hour12: false })
const size = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
const isAnswer = (e: OutboxEntry) => e.what.startsWith('answer request') || e.what.startsWith('image request')

function Row({ e, open, onToggle }: { e: OutboxEntry; open: boolean; onToggle: () => void }) {
  const tags = isAnswer(e) ? (e.tags ?? []) : []
  return (
    <div className={`rounded-md border ${isAnswer(e) ? 'border-eth/30 bg-eth/[0.03]' : 'border-line-2 bg-panel/50'}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-3 py-2 text-left">
        <span className="mt-px shrink-0 font-mono text-[10.5px] text-dim">{time(e.ts)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={`text-[13px] ${isAnswer(e) ? 'text-fg' : 'text-soft'}`}>{e.what}</span>
            {e.demo && <span className="font-mono text-[9.5px] tracking-[0.12em] text-warn/90">DEMO</span>}
          </span>
          <span className="block truncate font-mono text-[10.5px] text-dim">
            {e.method} {e.host}
            {e.path}
          </span>
          {tags.length > 0 && (
            <span className="mt-0.5 block font-mono text-[10.5px] text-ok/85">
              sent as placeholders: {tags.slice(0, 6).join(' ')}
              {tags.length > 6 ? ` +${tags.length - 6}` : ''}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right font-mono text-[10.5px] text-dim">
          {e.bytes ? size(e.bytes) : '—'}
          <span className={`block ${e.failed ? 'text-bad/90' : e.status && e.status >= 400 ? 'text-warn/90' : ''}`}>
            {e.demo ? 'not sent' : e.failed ? 'failed' : e.status ? `${e.status} · ${Math.round(e.ms ?? 0)} ms` : 'sending…'}
          </span>
        </span>
        <ChevronDown className={`mt-0.5 size-3.5 shrink-0 text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line px-3 py-2.5">
          {e.headers.length > 0 && (
            <div className="font-mono text-[10.5px] leading-relaxed text-dim">
              {e.headers.map((h) => (
                <div key={h} className="truncate">
                  {h}
                </div>
              ))}
            </div>
          )}
          {e.body ? (
            <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded border border-line bg-bg/60 p-2.5 font-mono text-[11px] leading-relaxed text-muted">{e.body}</pre>
          ) : (
            <p className="font-mono text-[10.5px] text-dim">{e.bytes ? 'binary body, not shown' : 'no body'}</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Outbox: every request this page sent in this tab, with what was in it. */
export function OutboxDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, files } = useOutbox()
  const [openId, setOpenId] = useState<number | null>(null)

  // opening the outbox unfolds the newest answer request: that's usually what people want to see
  useEffect(() => {
    if (!open) return
    setOpenId(entries.find(isAnswer)?.id ?? null)
  }, [open]) // only when the dialog opens

  const hosts = new Map<string, number>()
  for (const e of entries) if (!e.demo) hosts.set(e.host, (hosts.get(e.host) ?? 0) + 1)
  const answers = entries.filter(isAnswer)
  const tags = new Set(answers.flatMap((e) => e.tags ?? []))
  const fileTotal = files.reduce((n, f) => n + f.count, 0)

  return (
    <Modal open={open} onClose={onClose} eyebrow="PRIVACY · OUTBOX" title="What left this browser" width="lg">
      <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Every request this page sent in this tab, as it happened. Open one to see exactly what was in it: an answer request carries placeholders, not your names.
          Keys are masked. Nothing here is saved; reload and it&apos;s gone. Don&apos;t trust us, check it.
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-line-2 bg-bg/40 px-3 py-2">
            <div className="font-mono text-[10px] tracking-[0.14em] text-dim">REQUESTS</div>
            <div className="text-[22px] font-medium text-fg">{entries.filter((e) => !e.demo).length}</div>
            <div className="truncate font-mono text-[10.5px] text-dim">{hosts.size ? [...hosts.keys()].join(' · ') : 'none yet'}</div>
          </div>
          <div className="rounded-lg border border-eth/25 bg-eth/[0.03] px-3 py-2">
            <div className="font-mono text-[10px] tracking-[0.14em] text-dim">ANSWER REQUESTS</div>
            <div className="text-[22px] font-medium text-fg">{answers.length}</div>
            <div className="font-mono text-[10.5px] text-dim">paid by proof, no wallet in them</div>
          </div>
          <div className="rounded-lg border border-ok/25 bg-ok/[0.03] px-3 py-2">
            <div className="font-mono text-[10px] tracking-[0.14em] text-dim">SENT AS PLACEHOLDERS</div>
            <div className="text-[22px] font-medium text-ok">{tags.size}</div>
            <div className="truncate font-mono text-[10.5px] text-dim">{tags.size ? [...tags].slice(0, 4).join(' ') : 'nothing personal sent so far'}</div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] tracking-[0.14em] text-dim">
            <span>NEWEST FIRST</span>
            {entries.length > 0 && (
              <button type="button" onClick={clearOutbox} className="inline-flex items-center gap-1 tracking-normal text-faint hover:text-soft">
                <Trash2 className="size-3" /> clear
              </button>
            )}
          </div>
          {entries.length ? (
            <div className="max-h-[46dvh] space-y-1.5 overflow-y-auto pr-1">
              {entries.map((e) => (
                <Row key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId((id) => (id === e.id ? null : e.id))} />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-line-2 px-3 py-6 text-center text-[12.5px] text-dim">Nothing sent yet in this tab.</p>
          )}
        </div>

        <p className="font-mono text-[10.5px] leading-relaxed text-dim">
          Page files (code, fonts, models): {fileTotal}
          {files.length ? `, from ${files.map((f) => `${f.host} (${f.count})`).join(', ')}` : ''}. Not listed: what your browser or extensions do on their own, and
          downloads inside web workers (the OCR model, also from this site).
        </p>
      </div>
    </Modal>
  )
}

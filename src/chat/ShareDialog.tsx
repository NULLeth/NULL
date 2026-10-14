import { Check, Copy, KeyRound, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import type { Source } from '../live/stream'
import { generatePassphrase } from './backup'
import { LONG_LINK, makeShareHash } from './share'

export interface ShareItem {
  q: string
  /** the question as the model saw it (placeholders), when shielded */
  qWire?: string
  a: string
  /** the answer as the model wrote it (placeholders), when shielded */
  aWire?: string
  model: string
  ts: number
  sources?: Source[]
}

/** Makes a link that carries one question and its answer inside itself. */
export function ShareDialog({ item, onClose }: { item: ShareItem | null; onClose: () => void }) {
  const shieldable = !!item && ((item.qWire != null && item.qWire !== item.q) || (item.aWire != null && item.aWire !== item.a))
  const [hide, setHide] = useState(true)
  const [lock, setLock] = useState(false)
  const [pass, setPass] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setHide(true)
    setLock(false)
    setPass('')
    setLink('')
    setCopied(false)
  }, [item])

  const make = async () => {
    if (!item) return
    setBusy(true)
    try {
      const useWire = shieldable && hide
      const hash = await makeShareHash(
        {
          v: 1,
          q: useWire ? (item.qWire ?? item.q) : item.q,
          a: useWire ? (item.aWire ?? item.a) : item.a,
          model: item.model,
          ts: item.ts,
          sources: item.sources?.length ? item.sources : undefined,
          shielded: useWire || undefined,
        },
        lock && pass ? pass : undefined,
      )
      setLink(`${window.location.origin}/s${hash}`)
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    void navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal open={!!item} onClose={onClose} eyebrow="PRIVACY · SHARE" title="Share this answer" width="md">
      <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          The question and answer go <span className="text-fg">inside the link</span>, after the “#”. Browsers never send that part to a server, so nullzk.com never
          receives what you share. Files and images aren&apos;t included.
        </p>

        <label className={`flex items-start gap-2.5 text-[13.5px] leading-relaxed ${shieldable ? 'cursor-pointer text-soft' : 'text-dim'}`}>
          <input type="checkbox" checked={shieldable && hide} disabled={!shieldable} onChange={(e) => (setHide(e.target.checked), setLink(''))} className="mt-1 accent-[#43d392]" />
          <span>
            Keep personal details out: share it as the AI saw it, with placeholders like [NAME_1]
            {!shieldable && <span className="block font-mono text-[11px] text-faint">nothing in this answer was shielded</span>}
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-soft">
          <input type="checkbox" checked={lock} onChange={(e) => (setLock(e.target.checked), setLink(''))} className="mt-1 accent-[#43d392]" />
          Lock it with a passphrase (send the passphrase another way)
        </label>
        {lock && (
          <div className="flex h-10 items-center gap-2 rounded-md border border-line-2 bg-bg/60 px-3 focus-within:border-line-3">
            <KeyRound className="size-3.5 shrink-0 text-dim" />
            <input
              value={pass}
              onChange={(e) => (setPass(e.target.value), setLink(''))}
              placeholder="a passphrase"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-fg outline-none placeholder:text-faint"
            />
            <button type="button" onClick={() => (setPass(generatePassphrase()), setLink(''))} className="shrink-0 font-mono text-[10.5px] text-eth hover:underline">
              generate
            </button>
          </div>
        )}

        {!link ? (
          <Button block variant="primary" onClick={() => void make()} loading={busy} disabled={lock && pass.length < 6} icon={<Link2 className="size-3.5" />}>
            Create link
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/[0.04] p-1.5 pl-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-soft">{link}</span>
              <Button size="sm" variant="secondary" onClick={copy} icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className={`font-mono text-[10.5px] ${link.length > LONG_LINK ? 'text-warn/90' : 'text-dim'}`}>
              {link.length.toLocaleString('en-US')} characters
              {link.length > LONG_LINK ? ' · long: some apps may cut it, a shorter answer shares better' : ''}
              {lock ? ' · opens only with the passphrase' : ' · anyone with the link can read it'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

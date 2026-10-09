import { Check, Copy, Download, Eye, EyeOff, KeyRound, LockKeyhole, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { IS_LIVE } from '../config/mode'
import { BACKUP_EXT, generatePassphrase, makeBackup, MIN_PASSPHRASE, openBackup, storedIds, type BackupContents } from './backup'
import type { Conversation } from './store'

export interface RestoreResult {
  added: number
  newer: number
  kept: number
  files: number
}

const today = () => new Date().toISOString().slice(0, 10)

function PassField({ value, onChange, show, onShow, placeholder }: { value: string; onChange: (v: string) => void; show: boolean; onShow: () => void; placeholder: string }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-line-2 bg-bg/60 px-3 focus-within:border-line-3">
      <KeyRound className="size-3.5 shrink-0 text-dim" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent font-mono text-[13px] tracking-[0.04em] text-fg outline-none placeholder:text-faint"
      />
      <button type="button" onClick={onShow} aria-label={show ? 'Hide passphrase' : 'Show passphrase'} className="text-dim hover:text-fg">
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  )
}

/**
 * Encrypted backup: take every chat to another browser or device as one file only you can
 * open. Encryption happens here; NULL never sees the file or the passphrase.
 */
export function BackupDialog({
  open,
  onClose,
  conversations,
  shieldWords,
  onRestore,
  initialTab = 'export',
}: {
  open: boolean
  onClose: () => void
  conversations: Conversation[]
  shieldWords: string[]
  onRestore: (c: BackupContents) => Promise<RestoreResult>
  initialTab?: 'export' | 'import'
}) {
  const [tab, setTab] = useState<'export' | 'import'>(initialTab)
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [phase, setPhase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    setPass('')
    setShow(false)
    setSaved(false)
    setError('')
    setDone('')
    setFile(null)
  }, [open, initialTab])

  const switchTab = (t: 'export' | 'import') => {
    setTab(t)
    setPass('')
    setShow(false)
    setError('')
    setDone('')
  }

  const files = storedIds(conversations).filter((id) => !id.endsWith('.wire')).length
  const strong = pass.length >= MIN_PASSPHRASE

  const doExport = async () => {
    setBusy(true)
    setError('')
    setDone('')
    try {
      const { blob } = await makeBackup({ conversations, mode: IS_LIVE ? 'live' : 'demo', shieldWords }, pass, setPhase)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `null-chats-${today()}${BACKUP_EXT}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
      setDone(`Saved ${a.download} (${(blob.size / 1024 / 1024).toFixed(blob.size < 1024 * 1024 ? 2 : 1)} MB). Keep the passphrase somewhere safe.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The backup could not be made.')
    } finally {
      setBusy(false)
      setPhase('')
    }
  }

  const doImport = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setDone('')
    try {
      const contents = await openBackup(file, pass, setPhase)
      setPhase('Restoring…')
      const r = await onRestore(contents)
      const parts = [
        `${r.added} chat${r.added === 1 ? '' : 's'} added`,
        r.newer ? `${r.newer} updated to the newer copy` : '',
        r.kept ? `${r.kept} already here` : '',
        `${r.files} file${r.files === 1 ? '' : 's'} restored`,
      ].filter(Boolean)
      setDone(`${parts.join(' · ')}.${contents.mode !== (IS_LIVE ? 'live' : 'demo') ? ` This backup was made in ${contents.mode} mode.` : ''}`)
      setPass('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The backup could not be opened.')
    } finally {
      setBusy(false)
      setPhase('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} locked={busy} eyebrow="PRIVACY · YOUR CHATS" title="Encrypted backup" width="md">
      <div className="px-5 pb-6 pt-4 sm:px-6">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-line p-1 font-mono text-[11px] tracking-[0.12em]">
          {(['export', 'import'] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={busy}
              onClick={() => switchTab(t)}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md transition-colors ${tab === t ? 'bg-white/[0.07] text-fg' : 'text-dim hover:text-soft'}`}
            >
              {t === 'export' ? <Download className="size-3.5" /> : <Upload className="size-3.5" />}
              {t === 'export' ? 'BACK UP' : 'RESTORE'}
            </button>
          ))}
        </div>

        {tab === 'export' ? (
          <div className="space-y-4">
            <p className="text-[13.5px] leading-relaxed text-muted">
              Your chats live only in this browser. Take them with you as one file that is encrypted here, with a passphrase only you know.
            </p>
            <div className="rounded-lg border border-line-2 bg-bg/40 px-4 py-3 font-mono text-[11.5px] leading-relaxed">
              <div className="text-soft">
                {conversations.length} chat{conversations.length === 1 ? '' : 's'} · {files} file{files === 1 ? '' : 's'} and image{files === 1 ? '' : 's'} · your shield word list
              </div>
              <div className="mt-1 text-dim">not included: your private balance (it stays tied to this browser; withdraw first if you switch devices)</div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[10.5px] tracking-[0.14em] text-dim">PASSPHRASE</span>
                <button
                  type="button"
                  onClick={() => {
                    setPass(generatePassphrase())
                    setShow(true)
                    setSaved(false)
                  }}
                  className="font-mono text-[10.5px] tracking-[0.08em] text-eth hover:underline"
                >
                  generate a strong one
                </button>
              </div>
              <PassField value={pass} onChange={(v) => (setPass(v), setSaved(false))} show={show} onShow={() => setShow((s) => !s)} placeholder={`at least ${MIN_PASSPHRASE} characters`} />
              <div className="mt-1.5 flex items-center justify-between gap-3 font-mono text-[10.5px]">
                <span className={strong ? 'text-ok/85' : 'text-dim'}>{strong ? 'long enough' : `${Math.max(0, MIN_PASSPHRASE - pass.length)} more characters`}</span>
                {pass && (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(pass)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }}
                    className="inline-flex items-center gap-1 text-dim hover:text-fg"
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copied ? 'copied' : 'copy'}
                  </button>
                )}
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-soft">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 accent-[#43d392]" />
              I wrote the passphrase down. Without it the backup can&apos;t be opened, not by me and not by NULL.
            </label>
            <Button block variant="primary" onClick={() => void doExport()} disabled={!strong || !saved || !conversations.length} loading={busy} icon={<LockKeyhole className="size-3.5" />}>
              {busy ? phase || 'Working…' : 'Download encrypted backup'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13.5px] leading-relaxed text-muted">
              Open a <span className="font-mono text-soft">{BACKUP_EXT}</span> file made in NULL Chat. It is decrypted here; chats you already have keep the newer copy.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept={`${BACKUP_EXT},application/octet-stream`}
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError('')
                setDone('')
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-line-3 px-4 py-3 text-left transition-colors hover:border-ok/40"
            >
              <Upload className="size-4 shrink-0 text-dim" />
              <span className="min-w-0 truncate font-mono text-[12px] text-soft">{file ? file.name : `choose a ${BACKUP_EXT} file`}</span>
              {file && <span className="ml-auto shrink-0 font-mono text-[11px] text-dim">{(file.size / 1024 / 1024).toFixed(2)} MB</span>}
            </button>
            <PassField value={pass} onChange={setPass} show={show} onShow={() => setShow((s) => !s)} placeholder="the backup's passphrase" />
            <Button block variant="primary" onClick={() => void doImport()} disabled={!file || !pass} loading={busy} icon={<Upload className="size-3.5" />}>
              {busy ? phase || 'Working…' : 'Restore chats'}
            </Button>
          </div>
        )}

        {error && <p className="mt-4 rounded-md border border-bad/25 bg-bad/[0.05] px-3 py-2 text-[13px] leading-relaxed text-bad/90">{error}</p>}
        {done && <p className="mt-4 rounded-md border border-ok/25 bg-ok/[0.05] px-3 py-2 text-[13px] leading-relaxed text-ok/90">{done}</p>}

        <p className="mt-5 border-t border-line pt-4 font-mono text-[10.5px] leading-relaxed text-dim">
          AES-256-GCM · key from your passphrase with Argon2id (64 MB, 3 passes) · made and opened in your browser · NULL never sees the file or the passphrase
        </p>
      </div>
    </Modal>
  )
}

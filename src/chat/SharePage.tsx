import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LogoMark } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { LIVE } from '../config/mode'
import { Markdown } from './Markdown'
import { isLocked, NeedsPassphrase, readShareHash, type SharedChat } from './share'

const label = (id: string) => LIVE.chatModels.find((m) => m.id === id)?.label ?? id
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * /s#…: a shared question and answer, unpacked from the link in this browser. The text was
 * never uploaded; the server only served this page.
 */
export default function SharePage() {
  const [hash] = useState(() => window.location.hash)
  const [item, setItem] = useState<SharedChat | null>(null)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(() => isLocked(hash))
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Shared from NULL Chat'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    // a second shared link opened on this page only changes the hash: start over with it
    const onHash = () => window.location.reload()
    window.addEventListener('hashchange', onHash)
    if (!hash) setError('This link has nothing in it.')
    else if (!isLocked(hash))
      readShareHash(hash).then(setItem, (e: unknown) => setError(e instanceof Error ? e.message : 'This link is broken.'))
    return () => {
      window.removeEventListener('hashchange', onHash)
      robots.remove()
    }
  }, [hash])

  const unlock = async () => {
    setBusy(true)
    setError('')
    try {
      setItem(await readShareHash(hash, pass))
      setLocked(false)
    } catch (e) {
      setError(e instanceof NeedsPassphrase ? 'Type the passphrase.' : e instanceof Error ? e.message : 'Could not open it.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <header className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-6">
        <a href="/" className="inline-flex items-center gap-2" aria-label="NULL home">
          <LogoMark className="size-5" />
          <span className="font-mono text-[13px] font-semibold tracking-[0.26em]">NULL</span>
          <span className="font-mono text-[11px] tracking-[0.14em] text-dim">SHARED</span>
        </a>
        <a href="/chat" className="font-mono text-[11px] tracking-[0.12em] text-soft hover:text-fg">
          ASK YOUR OWN ›
        </a>
      </header>

      <main className="mx-auto max-w-[780px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-ok/25 bg-ok/[0.04] px-4 py-3 text-[12.5px] leading-relaxed text-ok/90">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <span>This answer came inside the link and was unpacked in your browser. It was never uploaded; nullzk.com only served this page.</span>
        </div>

        {locked && !item ? (
          <div className="mx-auto max-w-[420px] space-y-3 py-10 text-center">
            <KeyRound className="mx-auto size-6 text-eth" />
            <p className="text-[15px] text-soft">This answer is locked. Type the passphrase you were given.</p>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && pass && void unlock()}
              autoFocus
              className="h-10 w-full rounded-md border border-line-2 bg-panel px-3 text-center font-mono text-[13px] outline-none focus:border-line-3"
            />
            <Button block variant="primary" onClick={() => void unlock()} disabled={!pass} loading={busy}>
              Open
            </Button>
            {error && <p className="text-[13px] text-bad/90">{error}</p>}
          </div>
        ) : error && !item ? (
          <p className="py-16 text-center text-[15px] text-muted">{error}</p>
        ) : !item ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <article className="space-y-6">
            {item.q && (
              <div className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line-2 bg-white/[0.045] px-4 py-2.5 text-[15px] leading-relaxed">{item.q}</div>
              </div>
            )}
            <div className="flex gap-3.5">
              <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-line-2 text-soft">
                <LogoMark className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Markdown text={item.a} />
                {!!item.sources?.length && (
                  <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                    {item.sources.map((s, i) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex min-w-0 items-start gap-2.5 rounded-md border border-line-2 bg-panel/60 px-3 py-2 hover:border-line-3"
                      >
                        <span className="mt-px font-mono text-[10.5px] text-dim">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] text-soft">{s.title}</span>
                          <span className="block truncate font-mono text-[10.5px] text-dim">{host(s.url)}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] text-dim">
                  <span>{label(item.model)}</span>
                  <span>{new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {item.shielded && <span className="text-ok/80">shared with placeholders, no personal details</span>}
                  <span className="text-ok/80">paid by proof ✓</span>
                </div>
              </div>
            </div>
          </article>
        )}

        <div className="mt-12 rounded-xl border border-line-2 bg-panel/60 px-5 py-5 text-center">
          <p className="text-[15px] text-fg">Ask your own question, privately.</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">No account. Paid with a zero-knowledge proof. Names, files, faces and voice stay on your device.</p>
          <a href="/chat" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.1em] text-ok hover:underline">
            OPEN NULL CHAT <ExternalLink className="size-3" />
          </a>
        </div>
      </main>
    </div>
  )
}

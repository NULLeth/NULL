import { Check, Copy, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useConnection } from '../live/connection'
import { useUi } from '../state/ui'

const CHROME_FLAG = '--proxy-server="socks5://127.0.0.1:9150"'

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-soft underline decoration-line-3 underline-offset-2 hover:text-fg">
      {children}
    </a>
  )
}

/** Live answer to "am I on Tor?", from NULL's own /api/connection. */
export function ConnectionStatus() {
  const c = useConnection()
  const tor = c.status === 'done' && c.tor
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${tor ? 'border-ok/30 bg-ok/[0.05]' : 'border-line-2 bg-panel/60'}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        {c.status === 'checking' ? (
          <Spinner className="mt-0.5 size-4 shrink-0" />
        ) : tor ? (
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
        ) : (
          <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-dim" />
        )}
        <p className="text-[13.5px] leading-relaxed text-soft">
          {c.status === 'checking' && 'Checking your connection…'}
          {c.status === 'idle' && 'Not checked yet.'}
          {c.status === 'error' && 'Could not check right now. Try again in a moment.'}
          {c.status === 'done' &&
            (c.tor ? (
              <>
                <span className="text-ok">You&apos;re on Tor.</span> OpenRouter and NULL see a Tor exit{c.ip ? ` (${c.ip})` : ''}, not you.
              </>
            ) : (
              <>
                <span className="text-fg">Not on Tor.</span> Your IP{c.ip ? ` (${c.ip})` : ''} is visible to OpenRouter.
              </>
            ))}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={c.check} disabled={c.status === 'checking'}>
        Check again
      </Button>
    </div>
  )
}

function Way({ n, title, tag, children }: { n: number; title: string; tag?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line-2 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-dim">0{n}</span>
        <h3 className="text-[15px] font-medium text-fg">{title}</h3>
        {tag && <span className="rounded-full border border-ok/30 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] text-ok/90">{tag}</span>}
      </div>
      <div className="mt-2.5 space-y-2 text-[13.5px] leading-relaxed text-muted">{children}</div>
    </div>
  )
}

export function TorModal({ open }: { open: boolean }) {
  const { close } = useUi()
  const [copied, setCopied] = useState(false)
  return (
    <Modal open={open} onClose={close} eyebrow="PRIVACY · NETWORK" title="Use NULL over Tor" width="lg">
      <div className="space-y-5 px-5 pb-6 pt-5 sm:px-6">
        <p className="max-w-[640px] text-[14px] leading-relaxed text-muted">
          zkAPI hides <span className="text-fg">who pays</span>. Tor hides <span className="text-fg">where you connect from</span>. Use both and a request carries
          neither your wallet nor your IP.
        </p>
        <ConnectionStatus />

        <Way n={1} title="Your browser through Tor" tag="KEEPS YOUR WALLET">
          <p>
            Install <Ext href="https://www.torproject.org/download/">Tor Browser</Ext> and leave it open. It runs Tor on your computer at{' '}
            <span className="font-mono text-soft">127.0.0.1:9150</span>. Then send your normal browser through it:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 marker:text-dim">
            <li>
              <span className="text-soft">Firefox:</span> Settings → Network Settings → Manual proxy. SOCKS host <span className="font-mono text-soft">127.0.0.1</span>,
              port <span className="font-mono text-soft">9150</span>, SOCKS v5, and tick “Proxy DNS when using SOCKS v5”.
            </li>
            <li>
              <span className="text-soft">Chrome or Brave:</span> close every window, then start it with
              <span className="mt-1.5 flex items-center gap-2 rounded-md border border-line bg-[#08080a] px-3 py-2">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-soft">{CHROME_FLAG}</code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(CHROME_FLAG)
                    } catch {
                      /* ignore */
                    }
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1400)
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-dim transition-colors hover:text-fg"
                >
                  {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </span>
            </li>
          </ul>
          <p>Your wallet extension keeps working. Reload NULL and the check above turns green.</p>
        </Way>

        <Way n={2} title="On your phone: Orbot">
          <p>
            Install <Ext href="https://orbot.app/">Orbot</Ext> (Android and iOS) and switch on VPN mode. Then open{' '}
            <span className="font-mono text-soft">nullzk.com/chat</span> in your wallet app&apos;s browser.
          </p>
        </Way>

        <Way n={3} title="Tor Browser on its own">
          <p>
            The most anonymous option, but you need a wallet inside Tor Browser to fund. Set its security level to <span className="text-soft">Standard</span>:
            the zero-knowledge prover needs WebAssembly.
          </p>
        </Way>

        <div className="rounded-lg border border-line px-4 py-3">
          <div className="label !text-[10px]">GOOD TO KNOW</div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-muted marker:text-dim">
            <li>Your private balance lives in the browser you funded it in. Fund in the same browser you&apos;ll use over Tor.</li>
            <li>Tor is slower. Proofs and answers can take a few seconds longer.</li>
            <li>The deposit itself is public on Ethereum (wallet → vault). Tor hides your IP, zkAPI hides which requests that deposit paid for.</li>
            <li>
              zkAPI&apos;s command-line client is getting a Tor mode too:{' '}
              <Ext href="https://github.com/ethereum/zkapi/pull/16">PR #16 on github.com/ethereum/zkapi</Ext>.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}

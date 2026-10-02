import { ArrowRight, ArrowUpRight, FlaskConical, Wallet } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { connectInjected, demoWallet, discoverWallets, type DiscoveredWallet } from '../lib/wallet'
import { shortAddr } from '../lib/format'
import { IS_LIVE } from '../config/mode'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'

function Row({
  icon,
  title,
  sub,
  onClick,
  busy,
  disabled,
  tag,
}: {
  icon: ReactNode
  title: string
  sub: string
  onClick?: () => void
  busy?: boolean
  disabled?: boolean
  tag?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="group flex w-full items-center gap-4 rounded-lg border border-line bg-white/[0.01] px-4 py-3.5 text-left transition-colors hover:border-line-3 hover:bg-white/[0.03] disabled:cursor-default disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-white/[0.01]"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line-2 bg-panel-2 text-soft">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] text-fg">
          {title}
          {tag && <span className="rounded-[3px] bg-white/[0.06] px-1.5 py-px font-mono text-[9.5px] tracking-[0.12em] text-muted">{tag}</span>}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-dim">{sub}</span>
      </span>
      {busy ? (
        <Spinner className="size-4 text-soft" />
      ) : (
        !disabled && <ArrowRight className="size-4 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-soft" />
      )}
    </button>
  )
}

export function ConnectModal({ open, then }: { open: boolean; then?: 'fund' | 'withdraw' }) {
  const { connectWallet } = useNull()
  const ui = useUi()
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [scanning, setScanning] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(null)
    setScanning(true)
    const stop = discoverWallets(setWallets)
    const t = setTimeout(() => setScanning(false), 500)
    return () => {
      stop()
      clearTimeout(t)
    }
  }, [open])

  const finish = (label: string, address: string) => {
    ui.toast(`${label} connected · ${shortAddr(address)}`)
    if (then) ui.open({ name: then })
    else ui.close()
  }

  const connectWith = async (w: DiscoveredWallet) => {
    setBusy(w.uuid)
    setError(null)
    try {
      const info = await connectInjected(w)
      connectWallet(info)
      finish(w.name, info.address)
    } catch (e) {
      const msg = (e as { code?: number; message?: string })?.code === 4001 ? 'Request rejected in the wallet.' : ((e as Error)?.message ?? 'Could not connect.')
      setError(msg)
    } finally {
      setBusy(null)
    }
  }

  const connectDemo = () => {
    const w = demoWallet()
    connectWallet(w)
    finish('Demo wallet', w.address)
  }

  return (
    <Modal open={open} onClose={ui.close} eyebrow="WALLET" title="Connect a wallet" width="sm">
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Your wallet is only used to <span className="text-soft">fund</span> and <span className="text-soft">withdraw</span>. Spending from the private balance never
          touches it.
        </p>
        <div className="mt-5 space-y-2">
          {wallets.map((w) => (
            <Row
              key={w.uuid}
              icon={w.icon ? <img src={w.icon} alt="" className="size-5" /> : <Wallet className="size-4" strokeWidth={1.6} />}
              title={w.name}
              sub={IS_LIVE ? 'Browser wallet · Ethereum mainnet' : 'Browser wallet · nothing is signed in this demo'}
              busy={busy === w.uuid}
              onClick={() => connectWith(w)}
            />
          ))}
          {!wallets.length && (
            <Row
              icon={scanning ? <Spinner className="size-4" /> : <Wallet className="size-4" strokeWidth={1.6} />}
              title="Browser wallet"
              sub={scanning ? 'Looking for injected wallets…' : 'No injected wallet found in this browser.'}
              disabled
            />
          )}
          {!IS_LIVE && (
            <Row
              icon={<FlaskConical className="size-4" strokeWidth={1.6} />}
              title="Demo wallet"
              tag="RECOMMENDED"
              sub="Explore with a simulated address. No extension needed."
              onClick={connectDemo}
            />
          )}
        </div>
        {error && <p className="mt-3 font-mono text-[11.5px] text-bad">{error}</p>}
        {!wallets.length && !scanning && (
          <a
            href="https://ethereum.org/en/wallets/find-wallet/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-mono text-[10.5px] tracking-[0.1em] text-dim transition-colors hover:text-soft"
          >
            FIND A WALLET <ArrowUpRight className="size-3" />
          </a>
        )}
      </div>
    </Modal>
  )
}

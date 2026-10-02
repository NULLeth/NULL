import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Copy, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { shortAddr } from '../lib/format'
import { chainName } from '../lib/wallet'
import { useAccount } from '../live/useAccount'
import { useNull } from '../state/store'
import { useUi } from '../state/ui'
import { Button } from './ui/Button'
import { Identicon } from './ui/Identicon'

export function WalletButton({ block = false }: { block?: boolean }) {
  const { disconnectWallet } = useNull()
  const account = useAccount()
  const { open, toast } = useUi()
  const [menu, setMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const w = account.wallet
  if (!w) {
    return (
      <Button variant="secondary" size="sm" block={block} onClick={() => open({ name: 'connect' })} className="!h-9 !px-4">
        Connect wallet
      </Button>
    )
  }

  return (
    <div ref={box} className={`relative ${block ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-expanded={menu}
        className={`inline-flex h-9 items-center gap-2 rounded-[6px] border border-line-2 bg-white/[0.02] pl-2 pr-2.5 font-mono text-[12px] text-fg transition-colors hover:border-line-3 ${block ? 'w-full' : ''}`}
      >
        <Identicon value={w.address} size={18} />
        <span className="tnum">{shortAddr(w.address)}</span>
        {w.kind === 'demo' && <span className="rounded-[3px] bg-white/[0.06] px-1 py-px text-[9.5px] tracking-[0.1em] text-muted">DEMO</span>}
        <ChevronDown className={`ml-auto size-3.5 text-dim transition-transform ${menu ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] origin-top-right overflow-hidden rounded-lg border border-line-2 bg-raised shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="border-b border-line px-4 py-3">
              <div className="label !text-[10px]">{w.kind === 'demo' ? 'DEMO WALLET' : w.label.toUpperCase()}</div>
              <div className="mt-1 break-all font-mono text-[11.5px] leading-snug text-soft">{w.address}</div>
              <div className="mt-2 font-mono text-[10.5px] text-dim">NETWORK · {chainName(w.chainId).toUpperCase()}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(w.address)
                } catch {
                  /* ignore */
                }
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-mono text-[11.5px] tracking-[0.06em] text-soft transition-colors hover:bg-white/[0.04] hover:text-fg"
            >
              {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 text-dim" />}
              {copied ? 'COPIED' : 'COPY ADDRESS'}
            </button>
            <button
              type="button"
              onClick={() => {
                disconnectWallet()
                setMenu(false)
                toast('Wallet disconnected. Your private balance stays on this device.', 'info')
              }}
              className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left font-mono text-[11.5px] tracking-[0.06em] text-soft transition-colors hover:bg-white/[0.04] hover:text-fg"
            >
              <LogOut className="size-3.5 text-dim" />
              DISCONNECT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

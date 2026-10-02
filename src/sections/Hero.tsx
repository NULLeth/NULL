import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NetworkCanvas } from '../components/NetworkCanvas'
import { NullOrbit } from '../components/NullOrbit'
import { Button } from '../components/ui/Button'
import { StatusDot } from '../components/ui/StatusDot'
import { PROJECT } from '../config/project'
import { fmtInt } from '../lib/format'
import { networkSnapshot } from '../lib/network'
import { estimatedHead } from '../protocol/responses'
import { scrollToId } from '../state/ui'
import { HeroTerminal } from './HeroTerminal'
import { CopyAddress } from '../components/ui/CopyAddress'
import { ArrowUpRight } from 'lucide-react'
import { IS_LIVE } from '../config/mode'
import { useLive } from '../live/LiveProvider'

const ease = [0.22, 1, 0.36, 1] as const

/** Token contract address, shown once PROJECT.token.ca is set. */
function TokenBar() {
  const { ca, ticker, chain } = PROJECT.token
  if (!ca) return null
  const chart = `https://dexscreener.com/${chain}/${ca}`
  const swap = `https://app.uniswap.org/swap?chain=${chain}&outputCurrency=${ca}`
  return (
    <div className="mt-6 flex w-fit max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line-2 bg-panel/70 px-4 py-2.5 backdrop-blur">
      <span className="font-mono text-[10.5px] tracking-[0.14em] text-dim">{ticker} · CA</span>
      <CopyAddress value={ca} head={80} tail={0} label="contract address" className="!text-[12.5px] !text-fg [overflow-wrap:anywhere] text-left" />
      <a
        href={chart}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-mono text-[10.5px] tracking-[0.14em] text-muted transition-colors hover:text-fg"
      >
        CHART <ArrowUpRight className="size-3" />
      </a>
      <a
        href={swap}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-mono text-[10.5px] tracking-[0.14em] text-muted transition-colors hover:text-fg"
      >
        UNISWAP <ArrowUpRight className="size-3" />
      </a>
    </div>
  )
}

function StatusBar() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2600)
    return () => clearInterval(t)
  }, [])
  const live = useLive()
  const snap = networkSnapshot(now)
  const items = IS_LIVE
    ? [
        ['BLOCK', `#${fmtInt(estimatedHead(now))}`],
        ['NOTES IN VAULT', live?.vault ? fmtInt(live.vault.notes) : '—'],
        ['ETH IN VAULT', live?.vault ? live.vault.ethLocked.toFixed(3) : '—'],
        ['PROTOCOL', 'zkAPI · groth16'],
      ]
    : [
        ['BLOCK', `#${fmtInt(estimatedHead(now))}`],
        ['PRIVATE REQUESTS', fmtInt(snap.privateRequests)],
        ['ANONYMITY SET', fmtInt(snap.anonymitySet)],
        ['PROOF VERIFY', `${snap.verifierMs} ms`],
      ]
  return (
    <div className="relative z-10 border-t border-line bg-bg/60 backdrop-blur-sm">
      <div className="mx-auto flex h-11 max-w-[1240px] items-center gap-6 overflow-hidden px-4 font-mono text-[10.5px] tracking-[0.12em] sm:px-6 lg:px-8">
        <span className="inline-flex shrink-0 items-center gap-2 text-ok/90">
          <StatusDot tone="ok" live />
          {IS_LIVE ? 'MAINNET · LIVE' : 'MAINNET · DEMO'}
        </span>
        {items.map(([k, v], i) => (
          <span key={k} className={`shrink-0 whitespace-nowrap text-dim ${i > 1 ? 'hidden md:inline' : i > 0 ? 'hidden sm:inline' : ''}`}>
            {k} <span className="text-soft tnum">{v}</span>
          </span>
        ))}
        <span className="ml-auto hidden shrink-0 text-faint lg:inline">{PROJECT.domain}</span>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {/* ambient layers */}
      <div aria-hidden className="grid-bg fade-edges absolute inset-0 opacity-70" />
      <NetworkCanvas className="[mask-image:linear-gradient(to_bottom,#000_70%,transparent)] md:[mask-image:linear-gradient(to_right,transparent_8%,#000_55%)]" />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease, delay: 0.3 }}
        className="pointer-events-none absolute right-[-170px] top-[48%] hidden w-[640px] -translate-y-1/2 min-[1360px]:block 2xl:right-[-60px]"
      >
        <NullOrbit className="h-auto w-full" />
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="mb-6 inline-flex w-fit items-center gap-3 rounded-full border border-line-2 bg-panel/60 py-1.5 pl-1.5 pr-3.5 backdrop-blur"
        >
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-soft">zkAPI</span>
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-muted">
            <span className="sm:hidden">PRIVATE ACCESS LAYER</span>
            <span className="hidden sm:inline">{PROJECT.tagline.toUpperCase()}</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.05 }}
          className="max-w-[1000px] text-balance text-[44px] font-medium leading-[0.98] tracking-[-0.045em] text-fg sm:text-[64px] lg:text-[84px]"
        >
          Your identity shouldn&apos;t <span className="text-muted">follow every request.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="mt-6 max-w-[560px] text-pretty text-[17px] leading-relaxed text-muted sm:text-[18px]"
        >
          NULL turns ETH into private API credits for AI, RPC, data and autonomous agents.{' '}
          <span className="text-soft">{PROJECT.secondary}</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => scrollToId('network')}
            iconRight={<ArrowRight className="size-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />}
          >
            Enter network
          </Button>
          <a
            href="/chat"
            className="group/btn inline-flex h-12 select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-[6px] border border-ok/35 bg-ok/[0.06] px-6 font-mono text-[12px] uppercase tracking-[0.12em] text-fg transition-[background-color,border-color] duration-200 hover:border-ok/60 hover:bg-ok/[0.1] active:translate-y-px"
          >
            <StatusDot tone="ok" live />
            Open chat
            <ArrowRight className="size-4 text-ok/90 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </a>
          <Button variant="secondary" size="lg" onClick={() => scrollToId('how')} iconRight={<ArrowDown className="size-3.5 text-muted" />}>
            How it works
          </Button>
        </motion.div>

        <TokenBar />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.4 }}
          className="mt-10 lg:mt-11"
        >
          <HeroTerminal />
        </motion.div>
      </div>

      <StatusBar />
    </section>
  )
}

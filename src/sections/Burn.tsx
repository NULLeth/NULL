import { motion } from 'framer-motion'
import { ArrowUpRight, Flame } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NetworkStat } from '../components/NetworkStat'
import { PROJECT } from '../config/project'
import { fetchBurnStats, type BurnStats } from '../burn/chain'
import { fmtInt, fmtUsd } from '../lib/format'
import { useLive } from '../live/LiveProvider'

const ETHERSCAN = 'https://etherscan.io'
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const day = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtTokens = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : fmtInt(v))

function Verify({ label, address, href }: { label: string; address: string; href?: string }) {
  return (
    <a
      href={href ?? `${ETHERSCAN}/address/${address}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted transition-colors hover:text-fg"
    >
      <span className="text-dim">{label}</span> {short(address)} <ArrowUpRight className="size-3" />
    </a>
  )
}

export function Burn() {
  const [stats, setStats] = useState<BurnStats | null>(null)
  const [failed, setFailed] = useState(false)
  const { burn, token } = PROJECT
  const ethUsd = useLive()?.ethUsd ?? PROJECT.ethUsd
  useEffect(() => {
    let alive = true
    const load = () =>
      fetchBurnStats()
        .then((s) => alive && (setStats(s), setFailed(false)))
        .catch(() => alive && setFailed(true))
    void load()
    const t = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  if (!token.ca) return null
  const last = stats?.burns[0]
  return (
    <section id="burn" className="relative scroll-mt-16 border-t border-line py-24 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[720px]"
        >
          <div className="label mb-5 flex items-center gap-3">
            <Flame className="size-3.5 text-warn" />
            <span className="h-px w-6 bg-line-2" />
            <span className="text-muted">BUYBACK &amp; BURN</span>
          </div>
          <h2 className="font-mono text-[22px] font-medium leading-[1.25] tracking-[0.04em] text-fg sm:text-[26px]">
            100% OF CREATOR FEES
            <br />
            BUY BACK AND BURN {token.ticker}
          </h2>
          <p className="mt-6 text-[15.5px] leading-relaxed text-muted">
            Every {token.ticker} trade pays a {burn.tradeFee * 100}% fee on {burn.launchpad}: half goes to the launchpad, half to the NULL creator wallet. All
            of the creator half is used to buy {token.ticker} on the open market and send it to the dead address, where nobody can ever move it again. Every
            step is a public transaction you can check below.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 border border-line sm:grid-cols-3 [&>*]:border-line max-sm:[&>*:not(:last-child)]:border-b sm:[&>*:not(:last-child)]:border-r">
          <NetworkStat
            index={0}
            label={`${token.ticker} BURNED`}
            value={stats?.burned ?? 0}
            format={fmtTokens}
            note={stats ? `${stats.burnedPct.toFixed(2)}% of the supply, gone for good` : failed ? 'could not read the chain' : 'reading the chain…'}
          />
          <NetworkStat
            index={1}
            label="FEES FOR NEXT BUYBACK"
            value={stats?.feesWaitingEth ?? 0}
            format={(v) => `${v.toFixed(4)} ETH`}
            note={stats ? `≈ ${fmtUsd(stats.feesWaitingEth * ethUsd)} waiting in ${burn.launchpad}'s fee escrow` : '—'}
          />
          <NetworkStat
            index={2}
            label="BUYBACK BURNS"
            value={stats?.burns.length ?? 0}
            format={fmtInt}
            note={last ? `last one ${day(last.ts)}` : stats ? 'first burn coming up' : '—'}
          />
        </div>

        {!!stats?.burns.length && (
          <div className="border-x border-b border-line">
            {stats.burns.slice(0, 6).map((b) => (
              <a
                key={b.hash}
                href={`${ETHERSCAN}/tx/${b.hash}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 font-mono text-[12px] transition-colors first:border-t-0 hover:bg-white/[0.02] sm:px-7"
              >
                <span className="inline-flex items-center gap-2 text-soft">
                  <Flame className="size-3.5 text-warn" />
                  {fmtTokens(b.amount)} {token.ticker} burned
                </span>
                <span className="inline-flex items-center gap-1.5 text-dim">
                  {day(b.ts)} · {short(b.hash)} <ArrowUpRight className="size-3" />
                </span>
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-x border-b border-line px-5 py-4 sm:px-7">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-dim">VERIFY</span>
          <Verify label="creator wallet" address={burn.creator} />
          <Verify label="fee escrow" address={burn.escrow} />
          <Verify label="dead address" address={burn.dead} href={`${ETHERSCAN}/token/${token.ca}?a=${burn.dead}`} />
        </div>
        <p className="mt-4 font-mono text-[10.5px] leading-relaxed text-dim">
          Using NULL Chat never needs {token.ticker}: requests are paid in ETH through zkAPI, and NULL takes no cut of them. Burns come from {token.ticker}{' '}
          trading fees only.
        </p>
      </div>
    </section>
  )
}

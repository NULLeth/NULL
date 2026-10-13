import { ExternalLink, Users } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { IS_LIVE, LIVE } from '../config/mode'
import { useLive } from '../live/LiveProvider'
import { demoNote, level, useCrowd, yourCrowd, type Level } from './crowd'

const TONE: Record<Level, string> = { good: 'text-ok', fair: 'text-warn', small: 'text-bad' }
const WORD: Record<Level, string> = { good: 'big crowd', fair: 'small crowd', small: 'stands out' }

function Row({ n, label, why, lvl }: { n: number; label: string; why: string; lvl: Level }) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-line-2 bg-bg/40 px-4 py-3">
      <div className={`min-w-[64px] text-right text-[28px] font-medium tabular-nums tracking-[-0.02em] ${TONE[lvl]}`}>{n}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-[14px] text-fg">{label}</span>
          <span className={`font-mono text-[10.5px] tracking-[0.1em] ${TONE[lvl]}`}>{WORD[lvl].toUpperCase()}</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{why}</p>
      </div>
    </div>
  )
}

/**
 * Your crowd: who a request could have come from, read live from the zkAPI vault.
 * Explains what is public; it gives no advice on obscuring withdrawals.
 */
export function CrowdDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, error } = useCrowd()
  const live = useLive()
  const real = IS_LIVE && live?.hasNote && live.expiryTs != null ? { depositEth: live.depositEth, expiryTs: live.expiryTs } : null
  const demo = !IS_LIVE && data ? demoNote(data) : null
  const note = real ?? demo
  const mine = data && note ? yourCrowd(data, note) : null

  return (
    <Modal open={open} onClose={onClose} eyebrow="PRIVACY · YOUR CROWD" title="Who you hide among" width="md">
      <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
        <p className="text-[13.5px] leading-relaxed text-muted">
          Every request is paid with a zero-knowledge proof. It shows that <span className="text-fg">some</span> open note in the zkAPI vault paid, never which one. So
          your privacy is the size of the crowd you are in. All of this is public on Ethereum; here it is read live.
        </p>

        {!data && !error && (
          <div className="flex items-center gap-2 py-6 font-mono text-[12px] text-muted">
            <Spinner /> reading the vault on Ethereum…
          </div>
        )}
        {error && <p className="rounded-md border border-bad/25 bg-bad/[0.05] px-3 py-2 text-[13px] text-bad/90">Couldn&apos;t read the vault right now. Try again in a minute.</p>}

        {data && (
          <>
            <div className="rounded-xl border border-ok/25 bg-ok/[0.04] px-5 py-4">
              <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] text-ok/90">
                <Users className="size-3.5" />
                EVERY REQUEST HIDES AMONG
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[44px] font-medium tracking-[-0.03em] text-fg">{data.open}</span>
                <span className="text-[14px] text-muted">open notes</span>
              </div>
              <p className="text-[12.5px] text-dim">
                {data.notes} funded since launch · {data.notes - data.open} closed · grows with every new user
              </p>
            </div>

            {note && mine ? (
              <div className="space-y-2">
                <div className="font-mono text-[10.5px] tracking-[0.14em] text-dim">
                  {real
                    ? 'YOUR NOTE'
                    : `DEMO · THE NEWEST REAL DEPOSIT (${note.depositEth.toFixed(4)} ETH, ${demo ? new Date(demo.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}) STANDS IN FOR YOURS`}
                </div>
                <Row
                  n={mine.similar}
                  lvl={level(mine.similar)}
                  label="other deposits of a similar size (±25 %)"
                  why="Deposit and withdrawal amounts are public. The more deposits look like yours, the less your amount says about you. The 0.025 / 0.05 / 0.1 presets are common sizes."
                />
                <Row
                  n={mine.sameDay}
                  lvl={level(mine.sameDay)}
                  label="other deposits on the same day"
                  why="Deposits are public with their time. On a busy day yours is one of many; on a quiet day it stands out more."
                />
              </div>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-dim">Fund a private balance to see how your own note compares: its size and its day.</p>
            )}

            <div className="rounded-lg border border-line px-4 py-3 text-[12.5px] leading-relaxed text-muted">
              <div className="mb-1 font-mono text-[10.5px] tracking-[0.14em] text-dim">WHAT IS PUBLIC, WHAT ISN&apos;T</div>
              Public: each deposit (wallet, amount, time) and each withdrawal (amount, address, time). Not public: which note paid for which request. Your IP is
              visible to OpenRouter unless you use Tor.
            </div>

            <a
              href={`https://eth.blockscout.com/address/${LIVE.vault}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-dim hover:text-fg"
            >
              read live from the zkAPI vault {LIVE.vault.slice(0, 6)}…{LIVE.vault.slice(-4)} on Ethereum
              <ExternalLink className="size-3" />
            </a>
          </>
        )}
      </div>
    </Modal>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { FEED_LABEL } from '../protocol'
import { clock, fmtEth, fmtUsd } from '../lib/format'
import type { ActivityEvent } from '../state/types'
import { PrivacyIndicator } from './PrivacyIndicator'
import { CopyAddress } from './ui/CopyAddress'

const KIND_LABEL: Record<ActivityEvent['kind'], string> = {
  request: 'REQUEST',
  agent: 'AGENT',
  deposit: 'DEPOSIT',
  withdraw: 'WITHDRAW',
  deploy: 'DEPLOY',
  recall: 'RECALL',
}

export function eventTitle(e: ActivityEvent): string {
  if ((e.kind === 'request' || e.kind === 'agent') && e.serviceId) return FEED_LABEL[e.serviceId]
  return KIND_LABEL[e.kind]
}

function Amount({ e }: { e: ActivityEvent }) {
  if (e.costUsd != null) return <span className="text-fg">{fmtUsd(e.costUsd, { micro: true })}</span>
  if (e.amountEth != null) {
    const sign = e.kind === 'deposit' || e.kind === 'recall' ? '+' : e.kind === 'withdraw' || e.kind === 'deploy' ? '−' : ''
    return (
      <span className={sign === '+' ? 'text-ok' : 'text-fg'}>
        {sign}
        {fmtEth(e.amountEth)} ETH
      </span>
    )
  }
  return null
}

const PRIVACY_TIP: Partial<Record<ActivityEvent['kind'], string>> = {
  deposit: 'Your wallet is visible on the deposit itself. From here on, spending is unlinkable to it.',
  withdraw: 'Withdrawals are proven from the pool. Use a fresh address to keep them unlinked.',
}

/**
 * Live log: newest first, entries slide in. `compact` drops the second line
 * for tight spaces (dashboard overview).
 */
export function ActivityFeed({
  events,
  limit = 8,
  compact = false,
  emptyText = 'No activity yet.',
}: {
  events: ActivityEvent[]
  limit?: number
  compact?: boolean
  emptyText?: string
}) {
  const rows = events.slice(0, limit)
  if (!rows.length) {
    return <div className="px-5 py-10 text-center font-mono text-[12px] text-dim">{emptyText}</div>
  }
  return (
    <ul className="relative">
      <AnimatePresence initial={false}>
        {rows.map((e) => (
          <motion.li
            key={e.id}
            layout="position"
            initial={{ opacity: 0, y: -10, backgroundColor: 'rgba(138,152,255,0.06)' }}
            animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(138,152,255,0)' }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], backgroundColor: { duration: 1.6 } }}
            className="border-b border-line px-4 py-3 font-mono text-[12px] last:border-b-0 sm:px-5"
          >
            <div className="flex items-center gap-3">
              <span className="w-[62px] shrink-0 text-dim tnum">{clock(e.ts)}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="tracking-[0.08em] text-fg">{eventTitle(e)}</span>
                {e.actor !== 'YOU' && e.kind === 'agent' && <span className="ml-2 text-[11px] tracking-[0.08em] text-dim">{e.actor}</span>}
              </span>
              <span className="shrink-0 tnum">
                <Amount e={e} />
              </span>
            </div>
            {!compact && (
              <div className="mt-1 flex items-center gap-3 pl-[74px] text-[11.5px]">
                <span className="min-w-0 flex-1 truncate text-muted">
                  {e.kind !== 'agent' && e.actor !== 'YOU' ? `${e.actor} · ` : ''}
                  {e.detail}
                </span>
                <PrivacyIndicator
                  variant="feed"
                  label={e.kind === 'deposit' ? 'entry point' : 'identity hidden'}
                  tip={PRIVACY_TIP[e.kind] ?? 'Funding identity is not included in the service request.'}
                  className="shrink-0"
                />
              </div>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

/** Full table used in the dashboard ACTIVITY view. */
export function ActivityTable({ events }: { events: ActivityEvent[] }) {
  if (!events.length) return <div className="px-5 py-12 text-center font-mono text-[12px] text-dim">Nothing here yet.</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse font-mono text-[12px]">
        <thead>
          <tr className="border-b border-line text-left">
            {['TIME', 'ACTOR', 'EVENT', 'DETAIL', 'AMOUNT', 'PROOF / REF', 'BILLING LINK'].map((h) => (
              <th key={h} className="label whitespace-nowrap px-4 py-2.5 !text-[10px] font-normal first:pl-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.tr
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-line transition-colors last:border-b-0 hover:bg-white/[0.015]"
              >
                <td className="whitespace-nowrap px-4 py-2.5 pl-5 text-dim tnum">{clock(e.ts)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-soft">{e.actor}</td>
                <td className="whitespace-nowrap px-4 py-2.5 tracking-[0.06em] text-fg">{eventTitle(e)}</td>
                <td className="max-w-[260px] truncate px-4 py-2.5 text-muted">{e.detail}</td>
                <td className="whitespace-nowrap px-4 py-2.5 tnum">
                  <Amount e={e} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {e.ref ? <CopyAddress value={e.ref} head={6} tail={4} label="reference" className="!text-[11.5px] !text-muted" /> : <span className="text-faint">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {e.kind === 'deposit' ? (
                    <span className="text-[11px] text-dim">wallet → pool</span>
                  ) : (
                    <PrivacyIndicator variant="feed" label="none" tip={PRIVACY_TIP[e.kind] ?? 'Funding identity is not included in the service request.'} />
                  )}
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

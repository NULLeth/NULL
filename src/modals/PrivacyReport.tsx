import { motion } from 'framer-motion'
import { Check, Eye, EyeOff } from 'lucide-react'
import { Tooltip } from '../components/ui/Tooltip'

type Level = 'hidden' | 'none' | 'visible' | 'partial'

const ITEMS: { k: string; v: string; level: Level; tip: string }[] = [
  { k: 'Payment identity', v: 'HIDDEN', level: 'hidden', tip: 'Funding identity is not included in the service request.' },
  { k: 'Persistent API key', v: 'NONE', level: 'none', tip: 'There is no key to leak or correlate. Each request carries a one-time proof.' },
  { k: 'Cross-session billing link', v: 'HIDDEN', level: 'hidden', tip: 'Every request uses a fresh nullifier, so payments can’t be strung together into a profile.' },
  { k: 'Request content', v: 'VISIBLE TO PROVIDER', level: 'visible', tip: 'The model has to read your prompt to answer it. NULL hides who paid, not what you asked.' },
  { k: 'Network metadata', v: 'PARTIALLY VISIBLE', level: 'partial', tip: 'Requests exit through a NULL relay, but timing and size can still be observed.' },
]

const LIVE_NETWORK = {
  k: 'Network metadata',
  v: 'YOUR IP VISIBLE TO OPENROUTER',
  level: 'visible' as Level,
  tip: 'In live mode your browser talks to OpenRouter directly, so it can see your IP address and timing. Use Tor or a VPN to hide it.',
}

export function PrivacyReport({ requestId, active, live = false }: { requestId?: string; active: boolean; live?: boolean }) {
  const items = live ? ITEMS.map((it) => (it.k === 'Network metadata' ? LIVE_NETWORK : it)) : ITEMS
  const score = live ? 3 : 4
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3.5">
        <span className="label text-muted">PRIVACY REPORT</span>
        <span className="truncate font-mono text-[10.5px] text-dim">{requestId ?? 'per request'}</span>
      </div>
      <ul className="flex-1">
        {items.map((it, i) => {
          const good = it.level === 'hidden' || it.level === 'none'
          return (
            <motion.li
              key={it.k}
              initial={false}
              animate={{ opacity: active ? 1 : 0.55 }}
              transition={{ delay: active ? i * 0.12 : 0, duration: 0.4 }}
              className="border-b border-line px-5 py-3 last:border-b-0"
            >
              <Tooltip content={it.tip} className="block w-full">
                <span className="block w-full">
                  <span className="flex items-center gap-2 text-[13px] text-soft">
                    {good ? <EyeOff className="size-3.5 text-dim" strokeWidth={1.7} /> : <Eye className="size-3.5 text-dim" strokeWidth={1.7} />}
                    {it.k}
                  </span>
                  <span
                    className={`mt-1 flex items-center gap-1.5 pl-[22px] font-mono text-[11px] tracking-[0.12em] ${
                      good ? 'text-ok' : it.level === 'visible' ? 'text-warn' : 'text-warn/80'
                    }`}
                  >
                    {it.v}
                    {good && <Check className="size-3" strokeWidth={2.6} />}
                  </span>
                </span>
              </Tooltip>
            </motion.li>
          )
        })}
      </ul>
      <div className="border-t border-line px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="label">PRIVACY SCORE</span>
          <span className="font-mono text-[15px] text-fg">
            {score} <span className="text-dim">/ 5</span>
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-5 gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              initial={false}
              animate={{ opacity: active || i >= score ? 1 : 0.4 }}
              transition={{ delay: active ? 0.4 + i * 0.08 : 0 }}
              className={`h-1 rounded-full ${i < score ? 'bg-ok/80' : 'bg-white/[0.08]'}`}
            />
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-dim">
          NULL separates <span className="text-muted">who pays</span> from <span className="text-muted">what you ask</span>. Don&apos;t send anything you
          wouldn&apos;t send to the provider directly.
        </p>
      </div>
    </div>
  )
}

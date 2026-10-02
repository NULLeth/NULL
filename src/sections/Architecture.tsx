import { motion } from 'framer-motion'
import { Bot, Database, Fingerprint, Route, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { EthGlyph } from '../components/Logo'
import { SectionHeader } from '../components/SectionHeader'
import { StatusDot } from '../components/ui/StatusDot'
import { shortHex } from '../lib/format'
import { randHex, randId } from '../lib/random'

const CYCLE_MS = 4800

function Node({
  icon,
  title,
  meta,
  tone = 'default',
}: {
  icon: ReactNode
  title: string
  meta: ReactNode
  tone?: 'default' | 'identity' | 'zk'
}) {
  const ring =
    tone === 'zk'
      ? 'border-eth/40 bg-[#0d0f1c] shadow-[0_0_0_4px_rgb(138_152_255/0.05)]'
      : tone === 'identity'
        ? 'border-line-2 bg-panel-2'
        : 'border-line-2 bg-panel'
  return (
    <div className={`relative z-10 flex w-full max-w-[320px] items-center gap-3 rounded-lg border px-4 py-3 ${ring}`}>
      <span
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md border ${
          tone === 'zk' ? 'border-eth/30 text-eth' : 'border-line-2 text-soft'
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[11.5px] tracking-[0.12em] text-fg">{title}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-dim">{meta}</div>
      </div>
    </div>
  )
}

/** Vertical connector with a packet travelling down it. */
function Wire({ delay, label, tone = 'identity' }: { delay: number; label?: ReactNode; tone?: 'identity' | 'proof' }) {
  const color = tone === 'identity' ? 'bg-soft' : 'bg-ok'
  return (
    <div className="relative flex h-12 w-full max-w-[320px] justify-center">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-2" />
      <motion.span
        className={`absolute left-1/2 top-0 size-[5px] -translate-x-1/2 rounded-full ${color}`}
        initial={{ top: -2, opacity: 0 }}
        animate={{ top: [-2, 44], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.9, delay, repeat: Infinity, repeatDelay: CYCLE_MS / 1000 - 0.9, ease: 'easeInOut' }}
      />
      {label && <span className="absolute left-[calc(50%+14px)] top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] text-dim sm:text-[10.5px]">{label}</span>}
    </div>
  )
}

function useCycle() {
  const make = () => ({ req: randId('req', 8), proof: randHex(32), nullifier: randHex(32) })
  const [c, setC] = useState(make)
  useEffect(() => {
    const t = setInterval(() => setC(make()), CYCLE_MS)
    return () => clearInterval(t)
  }, [])
  return c
}

type Vis = 'hidden' | 'visible' | 'partial'
function Field({ k, v, vis, note }: { k: string; v: ReactNode; vis: Vis; note?: string }) {
  const tag = {
    hidden: { text: 'NOT SENT', cls: 'text-ok border-ok/25 bg-ok/[0.06]' },
    visible: { text: 'VISIBLE', cls: 'text-warn border-warn/25 bg-warn/[0.06]' },
    partial: { text: 'PARTIAL', cls: 'text-warn/80 border-warn/20 bg-warn/[0.04]' },
  }[vis]
  return (
    <div className="grid grid-cols-[96px_1fr_auto] items-center gap-3 border-b border-line px-4 py-2.5 font-mono text-[11.5px] last:border-b-0 sm:grid-cols-[110px_1fr_auto]">
      <span className="text-dim">{k}</span>
      <span className={`min-w-0 truncate ${vis === 'hidden' ? 'text-faint line-through decoration-faint' : 'text-soft'}`} title={note}>
        {v}
      </span>
      <span className={`rounded-[3px] border px-1.5 py-px text-[9.5px] tracking-[0.12em] ${tag.cls}`}>{tag.text}</span>
    </div>
  )
}

function ProviderView() {
  const c = useCycle()
  return (
    <div className="overflow-hidden rounded-lg border border-line-2 bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="label !text-[10px]">WHAT THE PROVIDER RECEIVES</div>
          <div className="mt-1 font-mono text-[12px] text-fg">
            POST <span className="text-muted">/v1/messages</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-ok/90">
          <StatusDot tone="ok" live />
          AUTHORIZED
        </span>
      </div>
      <motion.div key={c.req} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <div className="border-b border-line bg-white/[0.012] px-4 py-3 font-mono text-[11.5px] leading-[1.75]">
          <div>
            <span className="text-dim">x-null-proof</span> <span className="text-eth">{shortHex(c.proof, 10, 6)}</span>
          </div>
          <div>
            <span className="text-dim">x-null-nullifier</span> <span className="text-soft">{shortHex(c.nullifier, 8, 4)}</span>
          </div>
          <div>
            <span className="text-dim">x-null-request</span> <span className="text-soft">{c.req}</span>
          </div>
        </div>
        <Field k="payer" v="0x71F3A9c4…6E1992A" vis="hidden" />
        <Field k="api_key" v="sk-live-••••••••" vis="hidden" />
        <Field k="account" v="user@example.com" vis="hidden" />
        <Field k="prompt" v={'"Explain Ethereum blobs…"'} vis="visible" />
        <Field k="network" v="relay exit · timing, size" vis="partial" />
      </motion.div>
      <div className="border-t border-line px-4 py-3 text-[12.5px] leading-relaxed text-muted">
        Payment is proven, not identified. The provider still processes the request content, so NULL protects{' '}
        <span className="text-soft">who pays</span>, not <span className="text-soft">what you ask</span>.
      </div>
    </div>
  )
}

function Layer({ name, side, children, tone }: { name: string; side: string; children: ReactNode; tone: 'identity' | 'service' }) {
  return (
    <div className={`relative px-5 pb-6 pt-11 sm:px-8 ${tone === 'identity' ? 'bg-[linear-gradient(180deg,rgb(138_152_255/0.035),transparent_85%)]' : ''}`}>
      <div className="absolute left-5 right-5 top-4 flex items-center justify-between sm:left-8 sm:right-8">
        <span className="label !text-[10px] text-muted">{name}</span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-faint">{side}</span>
      </div>
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}

export function Architecture() {
  return (
    <section id="how" className="relative scroll-mt-16 border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="01"
          eyebrow="HOW IT WORKS"
          title={
            <>
              Public internet.
              <br />
              <span className="text-muted">Private access layer.</span>
            </>
          }
          sub="Your wallet funds a balance once. Every request after that is paid with a zero-knowledge proof, so providers get an authorized, paid call without the identity that funded it."
        />

        <div className="mt-14 grid gap-6 lg:mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-lg border border-line-2 bg-panel/70"
          >
            <Layer name="IDENTITY LAYER" side="KNOWN ONLY TO YOU" tone="identity">
              <div className="flex w-full max-w-[320px] gap-2">
                <div className="flex-1">
                  <Node icon={<Wallet className="size-4" strokeWidth={1.6} />} title="USER" meta="0x71F…92A" tone="identity" />
                </div>
                <div className="flex-1">
                  <Node icon={<Bot className="size-4" strokeWidth={1.6} />} title="AGENT" meta="spend key" tone="identity" />
                </div>
              </div>
              <Wire delay={0} label="deposit · on-chain" />
              <Node icon={<Fingerprint className="size-4" strokeWidth={1.6} />} title="NULL PRIVATE BALANCE" meta="note commitment in a shared pool" tone="identity" />
              <Wire delay={0.9} label="note stays on device" />
            </Layer>

            {/* the boundary */}
            <div className="relative px-5 sm:px-8">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-eth/30" />
              <div className="relative flex flex-col items-center">
                <Node
                  icon={<ShieldCheck className="size-4" strokeWidth={1.6} />}
                  title="ZERO-KNOWLEDGE AUTHORIZATION"
                  meta="proof π + one-time nullifier"
                  tone="zk"
                />
              </div>
              <div className="absolute left-5 top-1/2 hidden -translate-y-[calc(100%+5px)] font-mono text-[10px] tracking-[0.14em] text-eth/70 sm:left-8 sm:block">
                ZK BOUNDARY
              </div>
            </div>

            <Layer name="SERVICE LAYER" side="PUBLIC INTERNET" tone="service">
              <Wire delay={1.8} tone="proof" label="proof, no payer" />
              <Node icon={<Route className="size-4" strokeWidth={1.6} />} title="SERVICE ROUTER" meta="verifies proof · pays provider" />
              {/* fork into three endpoints */}
              <div className="relative h-10 w-full max-w-[400px]">
                <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden>
                  <path d="M200 0 V14 M200 14 H64 V40 M200 14 H336 V40 M200 14 V40" stroke="rgb(255 255 255 / 0.12)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
                </svg>
                <motion.span
                  className="absolute left-1/2 top-0 size-[5px] -translate-x-1/2 rounded-full bg-ok"
                  animate={{ top: [-2, 36], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.8, delay: 2.7, repeat: Infinity, repeatDelay: CYCLE_MS / 1000 - 0.8 }}
                />
              </div>
              <div className="grid w-full max-w-[400px] grid-cols-3 gap-2">
                {[
                  { t: 'AI', i: <Sparkles className="size-3.5" strokeWidth={1.6} /> },
                  { t: 'RPC', i: <EthGlyph className="size-3.5" /> },
                  { t: 'DATA', i: <Database className="size-3.5" strokeWidth={1.6} /> },
                ].map((x) => (
                  <div key={x.t} className="flex items-center justify-center gap-2 rounded-md border border-line-2 bg-panel py-2.5 font-mono text-[11px] tracking-[0.14em] text-soft">
                    <span className="text-muted">{x.i}</span>
                    {x.t}
                  </div>
                ))}
              </div>
            </Layer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start"
          >
            <ProviderView />
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line">
              {[
                ['01', 'FUND', 'Deposit ETH once. It becomes a private note.'],
                ['02', 'PROVE', 'Each call carries a proof, not a key.'],
                ['03', 'ACCESS', 'Providers get paid. Your wallet stays home.'],
              ].map(([n, t, d], i) => (
                <div key={t} className={`p-4 ${i < 2 ? 'border-r border-line' : ''}`}>
                  <div className="font-mono text-[10px] text-faint">{n}</div>
                  <div className="mt-2 font-mono text-[11.5px] tracking-[0.14em] text-fg">{t}</div>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{d}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

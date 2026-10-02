import { motion } from 'framer-motion'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { PROJECT } from '../config/project'
import { useUi } from '../state/ui'

const SPEC = [
  ['DEPOSIT', 'ETH goes into a shared pool. You keep a secret note; the pool only stores its commitment.'],
  ['PROVE', 'Each request carries a zero-knowledge proof that some unspent note can pay, plus a one-time nullifier.'],
  ['SETTLE', 'The router verifies, pays the provider and refunds unused credit to a fresh note.'],
]

const HONEST = [
  ['Hidden', 'Funding wallet, persistent API keys, accounts, cross-request billing links'],
  ['Not hidden', 'Request content (the provider must read it), and some network metadata unless you route through a relay'],
]

export function About() {
  const { open } = useUi()
  return (
    <section id="about" className="relative scroll-mt-16 border-t border-line py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="label mb-5 flex items-center gap-3">
            <span className="text-faint">05</span>
            <span className="h-px w-6 bg-line-2" />
            <span className="text-muted">TECHNOLOGY</span>
          </div>
          <h2 className="font-mono text-[22px] font-medium leading-[1.25] tracking-[0.04em] text-fg sm:text-[26px]">
            BUILT AROUND
            <br />
            ZERO-KNOWLEDGE ACCESS
          </h2>
          <div className="mt-7 max-w-[500px] space-y-4 text-[15.5px] leading-relaxed text-muted">
            <p>NULL is designed around prepaid private API credits. You fund a balance once.</p>
            <p>
              From then on, zero-knowledge proofs authorize usage, so individual API requests don&apos;t have to reveal the identity that funded them. Not
              to the provider, and not to us.
            </p>
            <p>
              NULL is designed to integrate with <span className="text-soft">Ethereum&apos;s zkAPI</span>, live on mainnet since October 2026: deposits
              into a shared vault, nullifiers against double-spends, and short-lived, spend-capped keys for each session.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => open({ name: 'docs' })} icon={<BookOpen className="size-3.5" />}>
              Read the integration notes
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-5"
        >
          <ol className="overflow-hidden rounded-lg border border-line">
            {SPEC.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[44px_1fr] gap-4 border-b border-line px-5 py-5 last:border-b-0">
                <span className="font-mono text-[11px] text-faint">0{i + 1}</span>
                <div>
                  <div className="font-mono text-[11.5px] tracking-[0.16em] text-fg">{t}</div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="border-b border-line px-5 py-3">
              <span className="label">WHAT NULL DOES AND DOESN&apos;T HIDE</span>
            </div>
            {HONEST.map(([k, v], i) => (
              <div key={k} className="grid grid-cols-[96px_1fr] gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
                <span className={`font-mono text-[11px] tracking-[0.1em] ${i === 0 ? 'text-ok' : 'text-warn'}`}>{k.toUpperCase()}</span>
                <span className="text-[13.5px] leading-relaxed text-muted">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {[
              [PROJECT.links.zkapiAnnouncement, 'ETHEREUM FOUNDATION: INTRODUCING ZKAPI'],
              [PROJECT.links.zkapiResearch, 'RESEARCH: ZK API USAGE CREDITS'],
            ].map(([href, text]) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-dim transition-colors hover:text-soft"
              >
                {text} <ArrowUpRight className="size-3" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { ArrowRight, KeyRound, ShieldCheck, Wallet } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'

/**
 * The live site's agents section: the real way to give agents a private budget today,
 * the NULL Agent Kit. (The simulated in-browser agents only appear on /demo.) The
 * dashboard on the right is an example of what the kit shows, labelled as such.
 */

const STEPS = [
  { n: '01', k: 'Fund the payment client', v: 'zkapi-clientd, the official zkAPI client, holds your private ETH balance and pays each request with a proof.' },
  { n: '02', k: 'Run the NULL Agent Kit', v: 'One file. Create a key and a daily budget for each agent.' },
  { n: '03', k: 'Point your agent at it', v: 'Any OpenAI-compatible SDK or framework, on http://127.0.0.1:8788/v1.' },
]

const CODE = `client = OpenAI(
  base_url="http://127.0.0.1:8788/v1",
  api_key="nk_...",   # this agent's key
)`

const EXAMPLE = [
  { name: 'research-bot', spent: 0.21, budget: 2, shield: '2 hidden' },
  { name: 'inbox-helper', spent: 0.38, budget: 1, shield: '5 hidden' },
  { name: 'trading-notes', spent: 0.07, budget: 0.5, shield: '—' },
]

export function AgentKitSection() {
  return (
    <section id="agents" className="relative scroll-mt-16 border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="04"
          eyebrow="PRIVATE AGENTS"
          title={
            <>
              Give machines a budget <span className="text-muted">without giving them your identity.</span>
            </>
          }
          sub="The NULL Agent Kit gives every AI agent its own key and daily budget. Requests are paid from your private ETH balance with a zero-knowledge proof, and personal details are shielded before they leave your machine."
          aside={
            <a
              href="/agents"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-fg px-4 font-mono text-[11.5px] tracking-[0.12em] text-bg transition-opacity hover:opacity-90"
            >
              NULL AGENT KIT <ArrowRight className="size-3.5" />
            </a>
          }
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border border-line bg-panel-2 px-5 py-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-dim">{s.n}</span>
                  <h3 className="text-[15.5px] font-medium text-fg">{s.k}</h3>
                </div>
                <p className="mt-1.5 pl-[30px] text-[13.5px] leading-relaxed text-muted">{s.v}</p>
              </div>
            ))}
            <pre className="overflow-x-auto rounded-lg border border-line-2 bg-[#08080a] px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-soft">
              <code>{CODE}</code>
            </pre>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 font-mono text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-eth" /> key + budget per agent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-ok" /> Prompt Shield, also in tool calls
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="size-3.5 text-eth" /> paid by proof via zkAPI
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col rounded-lg border border-line-2 bg-[#08080a]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <span className="font-mono text-[11px] tracking-[0.16em] text-soft">∅ NULL · AGENT KIT</span>
              <span className="rounded border border-line-2 px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.14em] text-dim">EXAMPLE</span>
            </div>
            <div className="flex-1 px-5 py-2">
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-3 border-b border-line py-2.5 font-mono text-[10px] tracking-[0.14em] text-dim">
                <span>AGENT</span>
                <span>TODAY</span>
                <span className="text-right">SHIELD</span>
              </div>
              {EXAMPLE.map((a) => (
                <div key={a.name} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-3 border-b border-line py-3.5 font-mono text-[12.5px] last:border-b-0">
                  <span className="truncate text-fg">{a.name}</span>
                  <span>
                    <span className="text-soft">${a.spent.toFixed(2)}</span>
                    <span className="text-dim"> of ${a.budget}</span>
                    <span className="mt-1.5 block h-[3px] w-full max-w-[140px] bg-line-2">
                      <span className="block h-[3px] bg-eth" style={{ width: `${Math.min(100, (a.spent / a.budget) * 100)}%` }} />
                    </span>
                  </span>
                  <span className={`text-right ${a.shield === '—' ? 'text-dim' : 'text-ok/90'}`}>{a.shield}</span>
                </div>
              ))}
            </div>
            <p className="border-t border-line px-5 py-3.5 font-mono text-[10.5px] leading-relaxed text-dim">
              Example of the kit&apos;s local dashboard at 127.0.0.1:8788. It runs on your machine; NULL never sees your agents or what they ask.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

import { ArrowRight, ArrowUpRight, Check, Copy, KeyRound, ShieldCheck, Terminal, Wallet, Waypoints } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { LogoMark } from '../components/Logo'
import { PROJECT } from '../config/project'

/**
 * /agents — the NULL Agent Kit: a local OpenAI-compatible API for AI agents on top of
 * zkapi-clientd. The kit itself is one file served from /agent/null-agent.mjs.
 */

const KIT_URL = `https://${PROJECT.domain}/agent/null-agent.mjs`
const CLIENTD_INSTALL = 'curl -fsSL https://github.com/ethereum/zkapi/releases/download/clientd-v0.1.6/install.sh | bash'

const SNIPPETS: Record<string, string> = {
  Python: `from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8788/v1", api_key="nk_...")

reply = client.chat.completions.create(
    model="claude",
    messages=[{"role": "user", "content": "Summarize today's ETH news"}],
)
print(reply.choices[0].message.content)`,
  JavaScript: `import OpenAI from 'openai'

const client = new OpenAI({ baseURL: 'http://127.0.0.1:8788/v1', apiKey: 'nk_...' })

const reply = await client.chat.completions.create({
  model: 'grok',
  messages: [{ role: 'user', content: 'Draft a reply to this email' }],
})
console.log(reply.choices[0].message.content)`,
  curl: `curl http://127.0.0.1:8788/v1/chat/completions \\
  -H "Authorization: Bearer nk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "claude", "messages": [{"role": "user", "content": "Hello"}]}'`,
}

const ALIASES: [string, string][] = [
  ['claude', 'Claude Sonnet 5.5'],
  ['opus', 'Claude Opus 5.5'],
  ['gpt', 'GPT-6.1'],
  ['gemini', 'Gemini 3.8 Flash'],
  ['grok', 'Grok 4.7'],
  ['deepseek', 'DeepSeek V4 Pro'],
  ['kimi', 'Kimi K3'],
  ['llama', 'Llama 4 Maverick'],
]

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-line-2 bg-[#08080a]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-dim">{label ?? 'SHELL'}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
            } catch {
              /* ignore */
            }
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          }}
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.1em] text-dim transition-colors hover:text-fg"
        >
          {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-soft">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-line pt-8 md:grid-cols-[180px_minmax(0,1fr)]">
      <div>
        <div className="font-mono text-[11px] tracking-[0.14em] text-dim">STEP 0{n}</div>
        <h3 className="mt-2 text-[18px] font-medium text-fg">{title}</h3>
      </div>
      <div className="min-w-0 space-y-3">{children}</div>
    </div>
  )
}

const FEATURES = [
  { icon: KeyRound, k: 'A key and a budget per agent', v: 'Every agent gets its own nk_ key with a daily dollar limit and, if you want, a list of allowed models. Revoke one without touching the others.' },
  { icon: ShieldCheck, k: 'Prompt Shield, built in', v: 'Names, emails, numbers, addresses and wallets are swapped for placeholders before a request leaves your machine, and put back into answers and tool calls.' },
  { icon: Wallet, k: 'Paid privately', v: 'Requests are paid from a private ETH balance with a zero-knowledge proof, through the Ethereum Foundation’s zkAPI client. No account, no API key, no card.' },
  { icon: Waypoints, k: 'Tor and fresh keys', v: 'Run the payment client through Tor and with a fresh key per request, so the provider can link neither your IP nor your requests.' },
]

export default function AgentsPage() {
  const [tab, setTab] = useState('Python')
  const [sha, setSha] = useState('')
  useEffect(() => {
    document.title = 'NULL Agent Kit · private money for AI agents'
    fetch('/agent/null-agent.mjs.sha256')
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => setSha(t.split(/\s+/)[0] ?? ''))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <a href="/" className="inline-flex items-center gap-2">
            <LogoMark className="size-5" />
            <span className="font-mono text-[13px] font-semibold tracking-[0.26em]">NULL</span>
            <span className="font-mono text-[11px] tracking-[0.14em] text-dim">AGENT KIT</span>
          </a>
          <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.14em]">
            <a href="/chat" className="text-muted hover:text-fg">
              CHAT
            </a>
            <a href={PROJECT.links.github} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">
              GITHUB
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 pb-24 sm:px-6">
        {/* hero */}
        <section className="pt-20 sm:pt-24">
          <div className="label flex items-center gap-3">
            <span className="text-eth">NEW</span>
            <span className="h-px w-6 bg-line-2" />
            <span className="text-muted">NULL AGENT KIT · v0.1</span>
          </div>
          <h1 className="mt-6 max-w-[820px] text-[40px] font-medium leading-[1.05] tracking-[-0.035em] sm:text-[60px]">
            Private money
            <br />
            <span className="text-muted">for AI agents.</span>
          </h1>
          <p className="mt-6 max-w-[640px] text-[16px] leading-relaxed text-muted">
            A local, OpenAI-compatible API for your agents. Every request is paid from a private ETH balance with a zero-knowledge proof, personal details are
            shielded before they leave your machine, and each agent gets its own key and daily budget.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#start" className="inline-flex h-10 items-center gap-2 rounded-md bg-fg px-4 font-mono text-[11.5px] tracking-[0.12em] text-bg hover:opacity-90">
              GET STARTED <ArrowRight className="size-3.5" />
            </a>
            <a
              href="/agent/null-agent.mjs"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 px-4 font-mono text-[11.5px] tracking-[0.12em] text-soft hover:border-line-3 hover:text-fg"
            >
              VIEW THE SOURCE <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </section>

        {/* flow */}
        <section className="mt-16 overflow-x-auto rounded-xl border border-line-2 bg-panel/50 p-5 sm:p-7">
          <div className="flex min-w-[720px] items-stretch gap-3 font-mono text-[11.5px]">
            {[
              ['YOUR AGENT', 'OpenAI SDK, LangChain, any bot', 'nk_ key'],
              ['NULL AGENT KIT', 'budget · Prompt Shield · spend log', '127.0.0.1:8788'],
              ['ZKAPI-CLIENTD', 'zero-knowledge proof · fresh key', '127.0.0.1:8787'],
              ['TOR (OPTIONAL)', 'hides your IP', 'socks5 :9050'],
              ['OPENROUTER', 'Claude, GPT, Grok, Gemini…', 'sees no wallet'],
            ].map(([k, v, n], i, arr) => (
              <div key={k} className="flex flex-1 items-center gap-3">
                <div className={`flex-1 rounded-lg border px-3.5 py-3 ${i === 1 ? 'border-eth/40 bg-eth/[0.06]' : 'border-line-2'}`}>
                  <div className={i === 1 ? 'text-eth' : 'text-fg'}>{k}</div>
                  <div className="mt-1 text-[10.5px] leading-snug text-dim">{v}</div>
                  <div className="mt-2 text-[10px] text-muted">{n}</div>
                </div>
                {i < arr.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-faint" />}
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10.5px] text-dim">Everything left of OpenRouter runs on your machine. NULL never sees your requests.</p>
        </section>

        {/* features */}
        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.k} className="rounded-xl border border-line-2 px-5 py-5">
              <f.icon className="size-4 text-eth" />
              <h3 className="mt-3 text-[16px] font-medium">{f.k}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.v}</p>
            </div>
          ))}
        </section>

        {/* quickstart */}
        <section id="start" className="mt-20 scroll-mt-8 space-y-10">
          <div className="flex items-center gap-3">
            <Terminal className="size-4 text-muted" />
            <h2 className="font-mono text-[14px] tracking-[0.16em]">QUICKSTART</h2>
            <span className="font-mono text-[11px] text-dim">macOS or Linux · Windows via WSL2 · Node 18+</span>
          </div>

          <Step n={1} title="Fund the payment client">
            <p className="text-[14px] leading-relaxed text-muted">
              zkapi-clientd is the official zkAPI client from the Ethereum Foundation and Open Anonymity. It holds your private balance and pays each request
              with a proof. Install it, fund it, and set it to use a fresh key for every request.
            </p>
            <CopyBlock code={`${CLIENTD_INSTALL}\nzkapi-clientd config\nzkapi-clientd config --key-reuse-window-seconds 0`} />
            <p className="text-[13px] text-dim">Optional, with Tor running: hide your IP from the provider too.</p>
            <CopyBlock code={'zkapi-clientd config --relay-url socks5://127.0.0.1:9050\nzkapi-clientd serve'} />
          </Step>

          <Step n={2} title="Run the NULL Agent Kit">
            <p className="text-[14px] leading-relaxed text-muted">One file, no dependencies. Check its fingerprint, create your first agent key, start it.</p>
            <CopyBlock code={`curl -fsSLO ${KIT_URL}\nshasum -a 256 null-agent.mjs\nnode null-agent.mjs init\nnode null-agent.mjs serve`} />
            {sha && (
              <p className="break-all font-mono text-[11px] text-dim">
                sha256 <span className="text-soft">{sha}</span>
              </p>
            )}
            <p className="text-[13px] text-dim">
              Dashboard with every agent&apos;s spend: <span className="font-mono text-soft">http://127.0.0.1:8788</span>
            </p>
          </Step>

          <Step n={3} title="Point your agent at it">
            <p className="text-[14px] leading-relaxed text-muted">Any OpenAI-compatible client works. Use the base URL and the nk_ key from step 2.</p>
            <div className="flex gap-1.5">
              {Object.keys(SNIPPETS).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`h-8 rounded-md border px-3 font-mono text-[11px] tracking-[0.08em] ${tab === k ? 'border-eth/40 bg-eth/10 text-eth' : 'border-line-2 text-dim hover:text-soft'}`}
                >
                  {k}
                </button>
              ))}
            </div>
            <CopyBlock code={SNIPPETS[tab]} label={tab.toUpperCase()} />
          </Step>

          <Step n={4} title="One key per agent">
            <p className="text-[14px] leading-relaxed text-muted">
              Give each agent its own key, daily budget and models. When the budget is used up, its requests stop until midnight UTC.
            </p>
            <CopyBlock code={'node null-agent.mjs add research-bot --budget 2 --models claude,grok\nnode null-agent.mjs agents\nnode null-agent.mjs remove research-bot'} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALIASES.map(([a, m]) => (
                <span key={a} className="rounded-md border border-line-2 px-2 py-1 font-mono text-[11px] text-muted">
                  <span className="text-fg">{a}</span> · {m}
                </span>
              ))}
              <span className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-dim">or any OpenRouter model id</span>
            </div>
          </Step>
        </section>

        {/* honest notes */}
        <section className="mt-20 rounded-xl border border-line-2 px-5 py-5 sm:px-7">
          <div className="label !text-[10px]">GOOD TO KNOW</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[13.5px] leading-relaxed text-muted marker:text-dim">
            <li>The model provider still reads the (shielded) request. NULL hides who pays, and the shield removes the details it can recognise.</li>
            <li>Budgets are checked before each request and charged with the real cost after it, so one request can go slightly over the limit.</li>
            <li>Without a fresh key per request, zkapi-clientd reuses a key for up to 60 seconds and the provider can link those requests.</li>
            <li>The spend log in ~/.null-agent records time, agent, model and cost. Never the content.</li>
            <li>
              Open source. The kit is served from {PROJECT.domain} and lives in the{' '}
              <a href={PROJECT.links.github} target="_blank" rel="noreferrer" className="text-soft underline decoration-line-3 underline-offset-2 hover:text-fg">
                NULL repository
              </a>
              ; zkapi-clientd is in{' '}
              <a href="https://github.com/ethereum/zkapi" target="_blank" rel="noreferrer" className="text-soft underline decoration-line-3 underline-offset-2 hover:text-fg">
                github.com/ethereum/zkapi
              </a>
              .
            </li>
          </ul>
        </section>

        <section className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <p className="text-[15px] text-muted">Rather chat yourself? NULL Chat runs in your browser.</p>
          <a href="/chat" className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 px-4 font-mono text-[11.5px] tracking-[0.12em] text-soft hover:border-line-3 hover:text-fg">
            OPEN NULL CHAT <ArrowRight className="size-3.5" />
          </a>
        </section>
      </main>
    </div>
  )
}

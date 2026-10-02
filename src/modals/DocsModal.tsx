import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/ui/Modal'
import { useUi } from '../state/ui'

const SNIPPET = `import { createNullClient } from '@null/sdk'

const nul = createNullClient({ network: 'mainnet' })

// 1 · fund once: the only step that touches your wallet
await nul.deposit({ amountEth: 0.1, signer })

// 2 · spend privately: every call carries a fresh proof
const res = await nul.request('anthropic/claude', {
  messages: [{ role: 'user', content: 'Explain Ethereum blobs' }],
})

// 3 · give an agent its own budget and scope
const agent = await nul.agents.create({
  name: 'SPECTRE',
  budgetEth: 0.05,
  scope: ['ai', 'data', 'blockchain'],
})`

function highlight(code: string) {
  // tiny, dependency-free highlighter: comments, strings, keywords
  return code.split('\n').map((line, i) => {
    const parts: { t: string; c: string }[] = []
    const re = /(\/\/.*$)|('[^']*')|\b(import|from|const|await)\b/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push({ t: line.slice(last, m.index), c: 'text-soft' })
      parts.push({ t: m[0], c: m[1] ? 'text-dim' : m[2] ? 'text-ok/80' : 'text-eth' })
      last = m.index + m[0].length
    }
    if (last < line.length) parts.push({ t: line.slice(last), c: 'text-soft' })
    return (
      <div key={i} className="min-h-[1.7em]">
        <span className="mr-4 inline-block w-5 select-none text-right text-faint">{i + 1}</span>
        {parts.map((p, j) => (
          <span key={j} className={p.c}>
            {p.t}
          </span>
        ))}
      </div>
    )
  })
}

export function DocsModal({ open }: { open: boolean }) {
  const { close } = useUi()
  const [copied, setCopied] = useState(false)
  return (
    <Modal open={open} onClose={close} eyebrow="DOCS · PREVIEW" title="Integrating NULL" width="lg">
      <div className="space-y-5 px-5 pb-6 pt-5 sm:px-6">
        <p className="max-w-[640px] text-[14px] leading-relaxed text-muted">
          The client exposes three verbs: <span className="font-mono text-soft">deposit</span>, <span className="font-mono text-soft">request</span> and{' '}
          <span className="font-mono text-soft">agents.create</span>. Everything else (notes, proofs, nullifiers, refunds) is handled for you.
        </p>
        <div className="overflow-hidden rounded-md border border-line-2">
          <div className="flex items-center justify-between border-b border-line bg-white/[0.015] px-4 py-2">
            <span className="font-mono text-[11px] text-dim">quickstart.ts</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(SNIPPET)
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
          <pre className="overflow-x-auto bg-[#08080a] px-4 py-4 font-mono text-[12.5px] leading-[1.7]">{highlight(SNIPPET)}</pre>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['STATUS', 'SDK not yet published. Interfaces may change.'],
            ['NETWORK', 'Ethereum mainnet deposits, zkAPI-style verification.'],
            ['PRIVACY', 'Hides the payer. Request content still reaches the provider.'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-line px-4 py-3">
              <div className="label !text-[10px]">{k}</div>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

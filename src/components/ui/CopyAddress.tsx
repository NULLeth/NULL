import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { shortAddr } from '../../lib/format'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // clipboard API blocked (http, iframe) — fall back to a hidden textarea
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/** Mono address with a copy button. Shows the compact form, copies the full value. */
export function CopyAddress({
  value,
  head = 5,
  tail = 3,
  className = '',
  label,
}: {
  value: string
  head?: number
  tail?: number
  className?: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        if (await copyText(value)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        }
      }}
      title={copied ? 'Copied' : `Copy ${label ?? 'address'}`}
      aria-label={copied ? 'Copied' : `Copy ${label ?? 'address'} ${value}`}
      className={`group/copy inline-flex items-center gap-1.5 rounded-[4px] font-mono text-[12px] text-soft transition-colors hover:text-fg ${className}`}
    >
      <span className="tnum">{shortAddr(value, head, tail)}</span>
      <span className="relative inline-flex size-3.5 items-center justify-center text-dim transition-colors group-hover/copy:text-muted">
        {copied ? <Check className="size-3 text-ok" strokeWidth={2.2} /> : <Copy className="size-3" strokeWidth={1.8} />}
      </span>
    </button>
  )
}

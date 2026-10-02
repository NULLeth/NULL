import { Check, EyeOff, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Tooltip } from './ui/Tooltip'

export const FUNDING_HIDDEN_TIP = 'Funding identity is not included in the service request.'

/**
 * Small privacy label ("PRIVATE BILLING ✓", "identity hidden ✓") that explains
 * itself on hover. Kept quiet on purpose: green check, no glow.
 */
export function PrivacyIndicator({
  label = 'PRIVATE BILLING',
  tip = FUNDING_HIDDEN_TIP,
  variant = 'inline',
  className = '',
}: {
  label?: ReactNode
  tip?: ReactNode
  variant?: 'inline' | 'badge' | 'feed'
  className?: string
}) {
  if (variant === 'badge') {
    return (
      <Tooltip content={tip} className={className}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/20 bg-ok/[0.06] py-1 pl-2 pr-2.5 font-mono text-[10.5px] tracking-[0.12em] text-ok/90 transition-colors hover:border-ok/40">
          <ShieldCheck className="size-3.5" strokeWidth={1.8} />
          {label}
        </span>
      </Tooltip>
    )
  }
  if (variant === 'feed') {
    return (
      <Tooltip content={tip} className={className}>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted transition-colors hover:text-soft">
          <EyeOff className="size-3 text-dim" strokeWidth={1.8} />
          {label}
          <Check className="size-3 text-ok" strokeWidth={2.4} />
        </span>
      </Tooltip>
    )
  }
  return (
    <Tooltip content={tip} className={className}>
      <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-muted transition-colors hover:text-fg">
        {label}
        <Check className="size-3 text-ok" strokeWidth={2.4} />
      </span>
    </Tooltip>
  )
}

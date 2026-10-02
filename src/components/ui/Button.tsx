import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'bracket'
type Size = 'sm' | 'md' | 'lg'

const base =
  'group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[6px] font-mono uppercase tracking-[0.12em] transition-[background-color,color,border-color,box-shadow,transform] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-40'

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[10.5px]',
  md: 'h-10 px-4 text-[11px]',
  lg: 'h-12 px-6 text-[12px]',
}

const variants: Record<Variant, string> = {
  primary: 'bg-fg text-bg hover:bg-white hover:shadow-[0_0_0_4px_rgb(255_255_255/0.06)]',
  secondary: 'border border-line-2 bg-white/[0.015] text-fg hover:border-line-3 hover:bg-white/[0.045]',
  ghost: 'text-muted hover:bg-white/[0.04] hover:text-fg',
  danger: 'border border-bad/25 text-bad/90 hover:border-bad/50 hover:bg-bad/[0.07]',
  bracket: 'text-soft hover:text-fg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, block, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const bracket = variant === 'bracket'
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${block ? 'w-full' : ''} ${bracket ? '!px-2' : ''} ${className}`}
      {...rest}
    >
      {bracket && (
        <span aria-hidden className="text-dim transition-transform duration-300 group-hover/btn:-translate-x-1 group-hover/btn:text-muted">
          [
        </span>
      )}
      {loading ? <Spinner className="size-3.5" /> : icon}
      {children && <span>{children}</span>}
      {iconRight}
      {bracket && (
        <span aria-hidden className="text-dim transition-transform duration-300 group-hover/btn:translate-x-1 group-hover/btn:text-muted">
          ]
        </span>
      )}
    </button>
  )
})

import { Hexagon, Image, Route, Search, Sparkles } from 'lucide-react'
import type { ServiceId } from '../protocol'
import { EthGlyph } from './Logo'

/** Neutral line glyphs — deliberately not vendor logos. */
export function ServiceIcon({ id, className = 'size-4' }: { id: ServiceId; className?: string }) {
  switch (id) {
    case 'claude':
      return <Sparkles className={className} strokeWidth={1.6} />
    case 'gpt':
      return <Hexagon className={className} strokeWidth={1.6} />
    case 'openrouter':
      return <Route className={className} strokeWidth={1.6} />
    case 'eth-rpc':
      return <EthGlyph className={className} />
    case 'web-search':
      return <Search className={className} strokeWidth={1.6} />
    case 'image-gen':
      return <Image className={className} strokeWidth={1.6} />
  }
}

export function ServiceIconTile({ id, size = 'md' }: { id: ServiceId; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-7' : 'size-9'
  const icon = size === 'sm' ? 'size-3.5' : 'size-4'
  return (
    <span className={`inline-flex ${box} shrink-0 items-center justify-center rounded-md border border-line-2 bg-white/[0.02] text-soft`}>
      <ServiceIcon id={id} className={icon} />
    </span>
  )
}

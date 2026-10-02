import { useMemo } from 'react'
import { hashString, seeded } from '../../lib/random'

/** 5×5 mirrored pixel identicon, monochrome with a hint of ETH blue. */
export function Identicon({ value, size = 18, className = '' }: { value: string; size?: number; className?: string }) {
  const cells = useMemo(() => {
    const rnd = seeded(hashString(value.toLowerCase()))
    const out: { x: number; y: number; o: number }[] = []
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        if (rnd() > 0.5) {
          const o = 0.35 + rnd() * 0.65
          out.push({ x, y, o })
          if (x < 2) out.push({ x: 4 - x, y, o })
        }
      }
    }
    return out
  }, [value])
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" className={`shrink-0 rounded-[3px] bg-white/[0.04] ${className}`} aria-hidden shapeRendering="crispEdges">
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="1" height="1" fill={(c.y + Math.min(c.x, 4 - c.x)) % 3 === 0 ? '#8a98ff' : '#f1f1f3'} fillOpacity={c.o * 0.85} />
      ))}
    </svg>
  )
}

import { useMemo } from 'react'
import { seeded } from '../lib/random'

/**
 * Stand-in for an image model: a deterministic flow-field drawing from the
 * request seed. Same seed, same picture.
 */
export function GenerativeImage({ seed, className = '' }: { seed: number; className?: string }) {
  const paths = useMemo(() => {
    const rnd = seeded(seed)
    const f1 = 0.004 + rnd() * 0.01
    const f2 = 0.004 + rnd() * 0.01
    const twist = 1.5 + rnd() * 3
    const cx = 160 + rnd() * 192
    const cy = 160 + rnd() * 192
    const out: { d: string; o: number; eth: boolean; w: number }[] = []
    for (let i = 0; i < 150; i++) {
      let x = rnd() * 512
      let y = rnd() * 512
      let d = `M${x.toFixed(1)} ${y.toFixed(1)}`
      const steps = 24 + Math.floor(rnd() * 40)
      for (let s = 0; s < steps; s++) {
        const dx = x - cx
        const dy = y - cy
        const r = Math.sqrt(dx * dx + dy * dy) + 1
        const a = Math.sin(x * f1) * twist + Math.cos(y * f2) * twist + Math.atan2(dy, dx) + Math.PI / 2 + 120 / r
        x += Math.cos(a) * 4
        y += Math.sin(a) * 4
        if (x < 0 || x > 512 || y < 0 || y > 512) break
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
      }
      out.push({ d, o: 0.12 + rnd() * 0.5, eth: rnd() < 0.16, w: 0.6 + rnd() * 0.9 })
    }
    return { out, cx, cy }
  }, [seed])

  return (
    <svg viewBox="0 0 512 512" className={`block h-auto w-full ${className}`} role="img" aria-label="Generated image (simulated)">
      <rect width="512" height="512" fill="#07070a" />
      <circle cx={paths.cx} cy={paths.cy} r="150" fill="#8a98ff" opacity="0.05" />
      {paths.out.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.eth ? '#8a98ff' : '#f1f1f3'} strokeOpacity={p.o} strokeWidth={p.w} strokeLinecap="round" />
      ))}
      <circle cx={paths.cx} cy={paths.cy} r="3" fill="#f1f1f3" />
    </svg>
  )
}

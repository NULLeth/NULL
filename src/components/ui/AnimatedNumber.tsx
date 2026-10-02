import { useEffect, useRef, useState } from 'react'

/**
 * Tweens between values. When the value rises it briefly tints green, when it
 * falls it stays neutral — so deposits feel like something happened while
 * micro-spends stay calm.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 900,
  flash = true,
  className = '',
}: {
  value: number
  format: (v: number) => string
  duration?: number
  flash?: boolean
  className?: string
}) {
  const [shown, setShown] = useState(value)
  const [rising, setRising] = useState(false)
  const from = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const a = from.current
    const b = value
    if (a === b) return
    if (flash && b > a && b - a > Math.abs(a) * 0.001) {
      setRising(true)
      setTimeout(() => setRising(false), duration + 500)
    }
    cancelAnimationFrame(raf.current)
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      const v = a + (b - a) * e
      from.current = v
      setShown(v)
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else from.current = b
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration, flash])

  return <span className={`tnum transition-colors duration-700 ${rising ? 'text-ok' : ''} ${className}`}>{format(shown)}</span>
}

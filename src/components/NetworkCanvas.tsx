import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hub: boolean
}
interface Packet {
  path: number[]
  hop: number
  t: number
  speed: number
}
interface Mote {
  x: number
  y: number
  vy: number
  a: number
}

const ETH = '138,152,255'

/**
 * Ambient network: drifting nodes, faint links, and the occasional packet
 * hopping across a few nodes. 2D canvas, paused when off-screen or hidden.
 */
export function NetworkCanvas({ className = '', density = 1, bias = 0.35 }: { className?: string; density?: number; bias?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = 1
    let nodes: Node[] = []
    let motes: Mote[] = []
    const packets: Packet[] = []
    let neighbors: number[][] = []
    let raf = 0
    let running = false
    let lastSpawn = 0
    let lastNeighbors = 0
    const mouse = { x: -9999, y: -9999 }

    const linkDist = () => (w < 640 ? 110 : 150)

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(95, Math.round(((w * h) / 15000) * density))
      const mobile = w < 768
      nodes = Array.from({ length: count }, () => {
        // bias nodes towards the right so the headline side stays calm
        const u = Math.random()
        const x = mobile ? Math.random() * w : w * (bias + (1 - bias) * Math.sqrt(u))
        const hub = Math.random() < 0.07
        return {
          x,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: hub ? 1.9 : 0.7 + Math.random() * 0.8,
          hub,
        }
      })
      motes = Array.from({ length: Math.round(count * 0.5) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: 0.04 + Math.random() * 0.1,
        a: 0.05 + Math.random() * 0.18,
      }))
      packets.length = 0
      computeNeighbors()
    }

    const computeNeighbors = () => {
      const d2 = linkDist() ** 2
      neighbors = nodes.map((a, i) => {
        const out: number[] = []
        for (let j = 0; j < nodes.length; j++) {
          if (j === i) continue
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          if (dx * dx + dy * dy < d2) out.push(j)
        }
        return out
      })
    }

    const spawnPacket = () => {
      if (packets.length >= 5 || !nodes.length) return
      let start = Math.floor(Math.random() * nodes.length)
      for (let tries = 0; tries < 8 && neighbors[start]?.length < 2; tries++) start = Math.floor(Math.random() * nodes.length)
      const path = [start]
      const hops = 3 + Math.floor(Math.random() * 4)
      for (let k = 0; k < hops; k++) {
        const opts = neighbors[path[path.length - 1]]?.filter((n) => !path.includes(n)) ?? []
        if (!opts.length) break
        path.push(opts[Math.floor(Math.random() * opts.length)])
      }
      if (path.length > 1) packets.push({ path, hop: 0, t: 0, speed: 0.012 + Math.random() * 0.01 })
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)
      const ld = linkDist()

      // motes
      for (const m of motes) {
        m.y -= m.vy
        if (m.y < -4) {
          m.y = h + 4
          m.x = Math.random() * w
        }
        ctx.fillStyle = `rgba(255,255,255,${m.a})`
        ctx.fillRect(m.x, m.y, 1, 1)
      }

      // move nodes
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -20) n.x = w + 20
        if (n.x > w + 20) n.x = -20
        if (n.y < -20) n.y = h + 20
        if (n.y > h + 20) n.y = -20
      }
      if (time - lastNeighbors > 500) {
        computeNeighbors()
        lastNeighbors = time
      }

      // links
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (const j of neighbors[i]) {
          if (j < i) continue
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d > ld) continue
          let alpha = (1 - d / ld) * 0.085
          const mx = (a.x + b.x) / 2 - mouse.x
          const my = (a.y + b.y) / 2 - mouse.y
          const md = Math.sqrt(mx * mx + my * my)
          if (md < 180) alpha += (1 - md / 180) * 0.12
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // nodes
      for (const n of nodes) {
        ctx.fillStyle = n.hub ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.32)'
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
        if (n.hub) {
          ctx.strokeStyle = 'rgba(255,255,255,0.08)'
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // packets
      {
        if (time - lastSpawn > 900) {
          spawnPacket()
          lastSpawn = time
        }
        for (let k = packets.length - 1; k >= 0; k--) {
          const p = packets[k]
          const a = nodes[p.path[p.hop]]
          const b = nodes[p.path[p.hop + 1]]
          if (!a || !b) {
            packets.splice(k, 1)
            continue
          }
          p.t += p.speed
          const x = a.x + (b.x - a.x) * p.t
          const y = a.y + (b.y - a.y) * p.t
          // lit segment behind the packet
          ctx.strokeStyle = `rgba(${ETH},0.28)`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(x, y)
          ctx.stroke()
          ctx.fillStyle = `rgba(${ETH},0.16)`
          ctx.beginPath()
          ctx.arc(x, y, 4.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgba(${ETH},0.95)`
          ctx.beginPath()
          ctx.arc(x, y, 1.6, 0, Math.PI * 2)
          ctx.fill()
          if (p.t >= 1) {
            p.t = 0
            p.hop++
            if (p.hop >= p.path.length - 1) packets.splice(k, 1)
          }
        }
      }
    }

    const loop = (t: number) => {
      draw(t)
      if (running) raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    build()
    draw(0)

    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0 })
    io.observe(canvas)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    let resizeT: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeT)
      resizeT = setTimeout(() => {
        build()
        draw(performance.now())
      }, 120)
    })
    ro.observe(canvas)
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      clearTimeout(resizeT)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [density, bias])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}

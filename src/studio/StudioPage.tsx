import { Download, Film as FilmIcon, Image as ImageIcon, Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { statsSound } from '../../film/audio'
import { renderFilm } from '../../film/export'
import { FILMS, type Film } from '../../film/films'
import { drawStatsCard, makeStatsFilm } from '../../film/stats'
import { LogoMark } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { fetchZkStats, type ZkStats } from './stats'

/**
 * NULL Studio (/studio, not linked, noindex): render the films and a live stats
 * update in this browser and download them. Nothing is uploaded anywhere.
 */

const CATALOG: { id: string; title: string; note: string; poster: number }[] = [
  { id: 'shield', title: 'Prompt Shield promo', note: '27 s · all 3 layers in your browser', poster: 13.9 },
  { id: 'tor', title: 'Tor mode promo', note: '26 s · hide who pays, hide where you are', poster: 8.8 },
  { id: 'image', title: 'Image generation promo', note: '28 s · private images in NULL Chat', poster: 16.4 },
  { id: 'models', title: '12 models promo', note: '28 s · all the models in NULL Chat', poster: 8.6 },
  { id: 'web', title: 'Web search promo', note: '27 s · private web search in NULL Chat', poster: 14.8 },
  { id: 'chat', title: 'NULL Chat promo', note: '24 s · simple: what NULL Chat is', poster: 12.6 },
  { id: 'how', title: 'How NULL works', note: '61 s · the six steps, explained', poster: 26 },
  { id: 'launch', title: 'Launch film', note: '38 s · hook, problem, product', poster: 13.6 },
]

const today = () => new Date().toISOString().slice(0, 10)

function download(blob: Blob, file: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
}

async function fontsReady() {
  await Promise.all([
    document.fonts.load("500 92px 'Geist Variable'"),
    document.fonts.load("600 104px 'Geist Mono Variable'"),
    document.fonts.load("400 20px 'Geist Mono Variable'"),
  ])
  await document.fonts.ready
}

/** Plays a film silently on a canvas until stopped. */
function usePlayer() {
  const [playing, setPlaying] = useState<string | null>(null)
  const raf = useRef(0)
  const play = useCallback((id: string, film: Film, canvas: HTMLCanvasElement | null) => {
    cancelAnimationFrame(raf.current)
    if (!canvas) return
    setPlaying(id)
    canvas.width = 960
    canvas.height = 540
    const ctx = canvas.getContext('2d')!
    const start = performance.now()
    const loop = (now: number) => {
      const t = (now - start) / 1000
      if (t > film.duration) {
        setPlaying(null)
        return
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      film.draw(ctx, 960, 540, t)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
  }, [])
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setPlaying(null)
  }, [])
  return { playing, play, stop }
}

function useRender() {
  const [job, setJob] = useState<{ id: string; text: string; pct: number } | null>(null)
  const run = useCallback(async (id: string, film: Film, file: string) => {
    const canvas = document.createElement('canvas')
    setJob({ id, text: 'preparing sound…', pct: 0 })
    try {
      const blob = await renderFilm(film, canvas, {
        width: 1920,
        height: 1080,
        fps: 60,
        bitrate: 16_000_000,
        onProgress: (done, total, stage) =>
          setJob({ id, text: stage === 'frames' ? `frame ${done} / ${total}` : stage === 'done' ? 'finishing…' : `rendering ${stage}…`, pct: total ? done / total : 0 }),
      })
      download(blob, file)
      setJob({ id, text: `done · ${(blob.size / 1e6).toFixed(1)} MB downloaded`, pct: 1 })
    } catch (e) {
      setJob({ id, text: `failed: ${(e as Error).message}`, pct: 0 })
    }
  }, [])
  return { job, run }
}

function Progress({ job, id }: { job: ReturnType<typeof useRender>['job']; id: string }) {
  if (!job || job.id !== id) return null
  return (
    <div className="mt-3">
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-eth transition-[width] duration-200" style={{ width: `${Math.round(job.pct * 100)}%` }} />
      </div>
      <div className="mt-1.5 font-mono text-[11px] text-muted">{job.text}</div>
    </div>
  )
}

function StatsRow({ s }: { s: ZkStats }) {
  const items: [string, string][] = [
    ['PRIVATE NOTES', String(s.notes)],
    ['ETH DEPOSITED', s.depositedEth.toFixed(3)],
    ['ANONYMITY SET', String(s.active)],
    ['NEW IN 24H', `+${s.new24h}`],
    ['ETH IN VAULT', s.vaultEth.toFixed(3)],
  ]
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
      {items.map(([k, v], i) => (
        <div key={k} className={`bg-panel px-4 py-3 ${i === items.length - 1 ? 'col-span-2' : ''}`}>
          <dt className="label !text-[10px]">{k}</dt>
          <dd className="mt-1 font-mono text-[18px] text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function StudioPage() {
  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState<ZkStats | null>(null)
  const [statsErr, setStatsErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const player = usePlayer()
  const render = useRender()
  const canvases = useRef<Record<string, HTMLCanvasElement | null>>({})

  useEffect(() => {
    document.title = 'NULL Studio'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    void fontsReady().then(() => setReady(true))
    return () => meta.remove()
  }, [])

  const loadStats = useCallback(async () => {
    setLoading(true)
    setStatsErr(null)
    try {
      setStats(await fetchZkStats())
    } catch (e) {
      setStatsErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const statsCard = useCallback((ctx: CanvasRenderingContext2D, w: number) => stats && drawStatsCard(ctx, w, stats), [stats])

  const downloadStatsImage = () => {
    if (!stats) return
    const c = document.createElement('canvas')
    c.width = 1920
    c.height = 1080
    drawStatsCard(c.getContext('2d')!, 1920, stats)
    c.toBlob((b) => b && download(b, `NULL-stats-${today()}.png`), 'image/png')
  }

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center gap-3 bg-bg font-mono text-[12px] text-muted">
        <Spinner className="size-4" /> loading studio…
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <a href="/" className="inline-flex items-center gap-2.5 text-fg">
              <LogoMark className="size-5" />
              <span className="font-mono text-[14px] font-semibold tracking-[0.26em]">NULL</span>
              <span className="font-mono text-[12px] tracking-[0.16em] text-dim">STUDIO</span>
            </a>
            <p className="mt-3 max-w-[620px] text-[14px] leading-relaxed text-muted">
              Render videos and images right here and download them. Everything is drawn in this browser (Chrome or Edge works best), 1920×1080 at 60 fps
              with sound. Rendering takes about as long as the video.
            </p>
          </div>
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-faint">PRIVATE PAGE · NOT LINKED</span>
        </header>

        {/* live stats */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-mono text-[13px] tracking-[0.16em] text-fg">LIVE zkAPI STATS</h2>
              <p className="mt-1 text-[13px] text-muted">
                Read from Ethereum mainnet just now. Good for a daily post (image) or a weekly update (video).
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={loadStats} loading={loading} icon={<RefreshCw className="size-3.5" />}>
              Refresh
            </Button>
          </div>
          {statsErr && <p className="mt-4 text-[13px] text-bad/90">Could not load stats: {statsErr}</p>}
          {stats && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <canvas
                  ref={(el) => {
                    canvases.current.stats = el
                    if (el && player.playing !== 'stats' && el.dataset.drawn !== String(stats.updatedAt)) {
                      el.width = 960
                      el.height = 540
                      statsCard(el.getContext('2d')!, 960)
                      el.dataset.drawn = String(stats.updatedAt)
                    }
                  }}
                  className="block aspect-video w-full rounded-lg border border-line-2 bg-bg"
                />
              </div>
              <div className="flex flex-col gap-4">
                <StatsRow s={stats} />
                <Button variant="primary" onClick={downloadStatsImage} icon={<ImageIcon className="size-3.5" />}>
                  Download stats image (PNG)
                </Button>
                <Button
                  variant="secondary"
                  disabled={!!render.job && !render.job.text.startsWith('done') && !render.job.text.startsWith('failed')}
                  onClick={() => render.run('stats', makeStatsFilm(stats, statsSound), `NULL-stats-${today()}.mp4`)}
                  icon={<FilmIcon className="size-3.5" />}
                >
                  Render stats video (16 s)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Play className="size-3.5" />}
                  onClick={() => {
                    if (player.playing === 'stats') {
                      player.stop()
                      const el = canvases.current.stats
                      if (el) statsCard(el.getContext('2d')!, 960)
                    } else player.play('stats', makeStatsFilm(stats, statsSound), canvases.current.stats)
                  }}
                >
                  {player.playing === 'stats' ? 'Stop preview' : 'Preview stats video'}
                </Button>
                <Progress job={render.job} id="stats" />
              </div>
            </div>
          )}
        </section>

        {/* films */}
        <section className="mt-14">
          <h2 className="font-mono text-[13px] tracking-[0.16em] text-fg">FILMS</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {CATALOG.map((f) => {
              const film = FILMS[f.id]
              const busy = !!render.job && !render.job.text.startsWith('done') && !render.job.text.startsWith('failed')
              return (
                <article key={f.id} className="flex flex-col rounded-xl border border-line bg-panel/60 p-4">
                  <div className="relative">
                    <canvas
                      ref={(el) => {
                        canvases.current[f.id] = el
                        if (el && player.playing !== f.id && !el.dataset.drawn) {
                          el.width = 960
                          el.height = 540
                          film.draw(el.getContext('2d')!, 960, 540, f.poster)
                          el.dataset.drawn = '1'
                        }
                      }}
                      className="block aspect-video w-full rounded-lg border border-line-2 bg-bg"
                    />
                  </div>
                  <h3 className="mt-4 text-[15px] font-medium text-fg">{f.title}</h3>
                  <p className="mt-1 font-mono text-[11px] text-dim">{f.note}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Play className="size-3.5" />}
                      onClick={() => (player.playing === f.id ? player.stop() : player.play(f.id, film, canvases.current[f.id]))}
                    >
                      {player.playing === f.id ? 'Stop' : 'Preview'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} icon={<Download className="size-3.5" />} onClick={() => render.run(f.id, film, `NULL-${f.id}.mp4`)}>
                      Render MP4
                    </Button>
                  </div>
                  <Progress job={render.job} id={f.id} />
                </article>
              )
            })}
          </div>
          <p className="mt-6 font-mono text-[11px] leading-relaxed text-dim">
            Previews are silent; the MP4 has sound. Films always use the current site settings (domain, @handle, CA).
          </p>
        </section>
      </div>
    </div>
  )
}

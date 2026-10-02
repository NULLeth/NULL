// NULL film workshop: preview (silent), scrub, render the MP4. Not part of the public site.
//
// For checking from a script: ?at=<seconds>&save=<name> saves one frame, ?sheet=<n>&save=<name>
// saves a contact sheet of n frames, both to brand/film/shots/ via the dev server.

import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import { renderFilm } from './export'
import { FILMS } from './films'
import { MONO, SANS } from './kit'

const film = FILMS.launch
const stage = document.getElementById('stage') as HTMLCanvasElement
const status = document.getElementById('status') as HTMLDivElement
const slider = document.getElementById('time') as HTMLInputElement
const clock = document.getElementById('clock') as HTMLSpanElement
const say = (m: string) => (status.textContent = m)

async function fontsReady() {
  await Promise.all([
    document.fonts.load(`500 92px ${SANS}`),
    document.fonts.load(`400 40px ${SANS}`),
    document.fonts.load(`600 104px ${MONO}`),
    document.fonts.load(`400 20px ${MONO}`),
  ])
  await document.fonts.ready
}

function draw(t: number, w = 1920, h = 1080) {
  if (stage.width !== w) stage.width = w
  if (stage.height !== h) stage.height = h
  const ctx = stage.getContext('2d')!
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  film.draw(ctx, w, h, t)
  slider.value = String(t)
  clock.textContent = `${t.toFixed(2)} / ${film.duration.toFixed(0)} s`
}

function sheet(count: number) {
  const cols = 4
  const cw = 640
  const ch = 360
  stage.width = cols * cw
  stage.height = Math.ceil(count / cols) * ch
  const ctx = stage.getContext('2d')!
  const cell = document.createElement('canvas')
  cell.width = 1920
  cell.height = 1080
  const c2 = cell.getContext('2d')!
  for (let i = 0; i < count; i++) {
    const at = (film.duration * (i + 0.5)) / count
    c2.setTransform(1, 0, 0, 1, 0, 0)
    film.draw(c2, 1920, 1080, at)
    const x = (i % cols) * cw
    const y = Math.floor(i / cols) * ch
    ctx.drawImage(cell, x, y, cw, ch)
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(x, y, 90, 24)
    ctx.fillStyle = '#8a98ff'
    ctx.font = '15px ui-monospace, monospace'
    ctx.fillText(`${at.toFixed(2)} s`, x + 8, y + 17)
  }
}

const toBlob = () => new Promise<Blob>((res, rej) => stage.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/png'))

function download(blob: Blob, file: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
}

async function save(name: string) {
  await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: await toBlob() })
  ;(window as unknown as { __saved?: string }).__saved = name
  say(`saved ${name}`)
}

let playing = false
let startWall = 0
let startT = 0
function loop(now: number) {
  if (!playing) return
  const t = startT + (now - startWall) / 1000
  if (t >= film.duration) {
    playing = false
    draw(film.duration - 0.001)
    ;(document.getElementById('play') as HTMLButtonElement).textContent = 'Play preview'
    return
  }
  draw(t)
  requestAnimationFrame(loop)
}

function bind(id: string, run: () => void | Promise<void>) {
  const b = document.getElementById(id) as HTMLButtonElement
  b.onclick = async () => {
    b.disabled = true
    try {
      await run()
    } catch (e) {
      say(`failed: ${(e as Error).message}`)
    } finally {
      b.disabled = false
    }
  }
}

async function start() {
  say('loading fonts…')
  await fontsReady()
  slider.max = String(film.duration)
  slider.oninput = () => {
    playing = false
    draw(Number(slider.value))
  }

  const play = document.getElementById('play') as HTMLButtonElement
  play.onclick = () => {
    playing = !playing
    play.textContent = playing ? 'Pause' : 'Play preview'
    if (playing) {
      startT = Number(slider.value) >= film.duration - 0.05 ? 0 : Number(slider.value)
      startWall = performance.now()
      requestAnimationFrame(loop)
    }
  }

  bind('render', async () => {
    playing = false
    const started = performance.now()
    const blob = await renderFilm(film, stage, {
      width: 1920,
      height: 1080,
      fps: 60,
      bitrate: 16_000_000,
      onProgress: (done, total, stage) => say(stage === 'frames' ? `rendering frame ${done} of ${total}…` : `rendering ${stage}…`),
    })
    download(blob, 'NULL-launch.mp4')
    say(`done: ${(blob.size / 1e6).toFixed(1)} MB in ${((performance.now() - started) / 1000).toFixed(0)} s — saved as NULL-launch.mp4`)
  })

  bind('png', async () => {
    const t = Number(slider.value)
    draw(t)
    download(await toBlob(), `NULL-launch-${t.toFixed(2)}s.png`)
  })

  const q = new URLSearchParams(location.search)
  const name = q.get('save')
  if (q.get('sheet')) sheet(Number(q.get('sheet')))
  else draw(Number(q.get('at') ?? 13.6))
  if (name) await save(name)
  say('')
}

// for checking the exporter without downloading: resolves to the MP4's byte size
;(window as unknown as { __testRender?: (seconds: number) => Promise<number> }).__testRender = async (seconds) => {
  const blob = await renderFilm({ ...film, duration: seconds }, stage, { width: 1920, height: 1080, fps: 60, bitrate: 16_000_000 })
  return blob.size
}

// dev only: render the full film and save it next to the workshop (brand/film/<name>.mp4)
;(window as unknown as { __renderToDisk?: (name: string) => Promise<number> }).__renderToDisk = async (name) => {
  const blob = await renderFilm(film, stage, { width: 1920, height: 1080, fps: 60, bitrate: 16_000_000, onProgress: (d, t, s) => say(`${s} ${d}/${t}`) })
  await fetch(`/__shot?name=${encodeURIComponent(name)}&ext=mp4`, { method: 'POST', body: blob })
  return blob.size
}

void start()

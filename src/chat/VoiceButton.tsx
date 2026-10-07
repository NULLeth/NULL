import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Spinner } from '../components/ui/Spinner'
import { Tooltip } from '../components/ui/Tooltip'
import { loadVoice, MAX_SECONDS, toMono16k, transcribe, VOICE_MODEL_MB, type Transcript } from './voice'

type State = { status: 'idle' } | { status: 'recording'; since: number } | { status: 'working'; progress: number | null }

const LANG_NAME = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * Private Voice: record with the microphone, turn it into text with Whisper in this browser,
 * hand the text to the composer. The audio stays in memory and is dropped afterwards.
 */
export function VoiceButton({ disabled, onText, onNote }: { disabled: boolean; onText: (text: string) => void; onNote: (note: { text: string; tone: 'ok' | 'warn' } | null) => void }) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [level, setLevel] = useState(0)
  const [now, setNow] = useState(0)
  const rec = useRef<{ recorder: MediaRecorder; stream: MediaStream; ctx: AudioContext; raf: number; timer: number; clock: number } | null>(null)
  const loading = useRef<{ progress: number; done: boolean }>({ progress: 0, done: false })

  useEffect(() => () => release(), [])

  function release() {
    const r = rec.current
    if (!r) return
    cancelAnimationFrame(r.raf)
    clearTimeout(r.timer)
    clearInterval(r.clock)
    r.stream.getTracks().forEach((t) => t.stop())
    void r.ctx.close()
    rec.current = null
  }

  async function start() {
    onNote(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
    } catch {
      onNote({ text: 'Microphone blocked: allow it for this site in your browser to talk.', tone: 'warn' })
      return
    }
    // the model downloads while you talk (once; cached afterwards)
    loading.current = { progress: 0, done: false }
    void loadVoice((p) => (loading.current.progress = p)).then(
      () => (loading.current.done = true),
      () => (loading.current.done = true),
    )
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = () => void finish(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let s = 0
      for (const v of buf) s += v * v
      setLevel(Math.min(1, Math.sqrt(s / buf.length) * 6))
      if (rec.current) rec.current.raf = requestAnimationFrame(tick)
    }
    const since = performance.now()
    // the clock runs on a timer, so it keeps counting in a background tab
    rec.current = {
      recorder,
      stream,
      ctx,
      raf: requestAnimationFrame(tick),
      timer: window.setTimeout(stop, MAX_SECONDS * 1000),
      clock: window.setInterval(() => setNow(performance.now()), 250),
    }
    recorder.start()
    setState({ status: 'recording', since })
    setNow(since)
  }

  function stop() {
    const r = rec.current
    if (!r || r.recorder.state === 'inactive') return
    r.recorder.stop()
  }

  async function finish(blob: Blob) {
    release()
    setLevel(0)
    setState({ status: 'working', progress: loading.current.done ? null : loading.current.progress })
    const poll = window.setInterval(() => setState({ status: 'working', progress: loading.current.done ? null : loading.current.progress }), 200)
    try {
      const audio = await toMono16k(blob)
      const r: Transcript = await transcribe(audio)
      if (!r.text) onNote({ text: 'Didn’t catch any words. Try again a little closer to the microphone.', tone: 'warn' })
      else {
        onText(r.text)
        const lang = r.lang && r.lang !== 'en' ? ` · heard ${LANG_NAME(r.lang)}` : ''
        onNote({
          text: `${r.seconds.toFixed(1)} s of speech turned into text on your device in ${(r.ms / 1000).toFixed(1)} s${lang} · your voice was not sent anywhere`,
          tone: 'ok',
        })
      }
    } catch (err) {
      onNote({ text: `Voice didn’t work here: ${err instanceof Error ? err.message : 'unknown error'}`, tone: 'warn' })
    } finally {
      clearInterval(poll)
      setState({ status: 'idle' })
    }
  }

  const secs = state.status === 'recording' ? Math.floor((now - state.since) / 1000) : 0
  const tip =
    state.status === 'recording'
      ? 'Recording. Click to stop and turn it into text.'
      : `Talk instead of typing. Whisper turns your voice into text right here in your browser (${VOICE_MODEL_MB} MB, downloads once). Your voice is never sent: only the text goes, through Prompt Shield.`

  return (
    <Tooltip content={tip}>
      <button
        type="button"
        onClick={() => (state.status === 'recording' ? stop() : state.status === 'idle' ? void start() : undefined)}
        disabled={disabled || state.status === 'working'}
        aria-label={state.status === 'recording' ? 'Stop recording' : 'Talk'}
        aria-pressed={state.status === 'recording'}
        className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] tabular-nums transition-colors disabled:opacity-50 ${
          state.status === 'recording' ? 'border-bad/50 bg-bad/10 text-bad' : state.status === 'working' ? 'border-ok/35 text-ok/90' : 'border-line-2 text-dim hover:border-line-3 hover:text-soft'
        }`}
      >
        {state.status === 'recording' ? (
          <>
            <span className="relative inline-flex size-3.5 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-bad/30" style={{ transform: `scale(${1 + level * 1.2})` }} />
              <Square className="relative size-2.5 fill-current" />
            </span>
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
          </>
        ) : state.status === 'working' ? (
          <>
            <Spinner />
            {state.progress != null ? `${Math.round(state.progress * 100)}%` : null}
          </>
        ) : (
          <Mic className="size-3.5" />
        )}
      </button>
    </Tooltip>
  )
}

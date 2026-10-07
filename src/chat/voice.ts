import { cachedBytes, loadOrt, type Ort } from './ort'

/**
 * Private Voice: speech to text in the browser with OpenAI's Whisper (tiny, multilingual,
 * MIT licence; ONNX export by onnx-community, quantized to ~41 MB). The microphone audio is
 * turned into text on this device and then dropped. It is never uploaded anywhere: the text
 * is what gets sent, after Prompt Shield, like anything typed.
 *
 * Browsers' built-in speech recognition (Web Speech API) sends the audio to a cloud service,
 * which is why it is not used here.
 */

const BASE = '/models/whisper-tiny/'
const CACHE = 'null-voice-v1'
export const VOICE_MODEL_MB = 41
/** longest recording; split into Whisper's 30 s windows */
export const MAX_SECONDS = 90

const SR = 16000
const N_FFT = 400
const HOP = 160
const N_MELS = 80
const FRAMES = 3000
const CHUNK = SR * 30

// special tokens (multilingual Whisper vocabulary)
const EOT = 50257
const SOT = 50258
const TRANSCRIBE = 50359
const NO_TIMESTAMPS = 50363
const FIRST_LANG = 50259
const LAST_LANG = 50357
const MAX_TOKENS = 224

type Tensor = import('onnxruntime-web/wasm').Tensor
type Session = import('onnxruntime-web/wasm').InferenceSession

interface Model {
  ort: Ort
  encoder: Session
  decoder: Session
  /** id → byte-level BPE token */
  tokens: string[]
  langs: Map<number, string>
  suppress: number[]
  beginSuppress: number[]
  layers: number
  heads: number
  headDim: number
}

let model: Promise<Model> | null = null

/** Loads Whisper once (two files, ~41 MB, cached after the first time). */
export function loadVoice(onProgress?: (p: number) => void): Promise<Model> {
  model ??= (async () => {
    // progress weighted by file size: encoder ~10 MB, decoder ~31 MB
    let pe = 0
    let pd = 0
    const report = () => onProgress?.(pe * 0.25 + pd * 0.75)
    const [ort, enc, dec, vocab, added, gen, cfg] = await Promise.all([
      loadOrt(),
      cachedBytes(CACHE, `${BASE}encoder_model_quantized.onnx`, (p) => ((pe = p), report())),
      cachedBytes(CACHE, `${BASE}decoder_model_merged_quantized.onnx`, (p) => ((pd = p), report())),
      fetch(`${BASE}vocab.json`).then((r) => r.json() as Promise<Record<string, number>>),
      fetch(`${BASE}added_tokens.json`).then((r) => r.json() as Promise<Record<string, number>>),
      fetch(`${BASE}generation_config.json`).then((r) => r.json() as Promise<{ suppress_tokens: number[]; begin_suppress_tokens: number[]; lang_to_id: Record<string, number> }>),
      fetch(`${BASE}config.json`).then((r) => r.json() as Promise<{ decoder_layers: number; decoder_attention_heads: number; d_model: number }>),
    ])
    const opts = { executionProviders: ['wasm'] }
    const [encoder, decoder] = await Promise.all([ort.InferenceSession.create(new Uint8Array(enc), opts), ort.InferenceSession.create(new Uint8Array(dec), opts)])
    const tokens: string[] = []
    for (const [t, id] of Object.entries(vocab)) tokens[id] = t
    for (const [t, id] of Object.entries(added)) tokens[id] = t
    const langs = new Map(Object.entries(gen.lang_to_id).map(([t, id]) => [id, t.replace(/[<|>]/g, '')] as [number, string]))
    return {
      ort,
      encoder,
      decoder,
      tokens,
      langs,
      suppress: gen.suppress_tokens,
      beginSuppress: gen.begin_suppress_tokens,
      layers: cfg.decoder_layers,
      heads: cfg.decoder_attention_heads,
      headDim: cfg.d_model / cfg.decoder_attention_heads,
    }
  })().catch((e) => {
    model = null
    throw e
  })
  return model
}

// ── features: Whisper's log-mel spectrogram ──────────────────────────────────

let melFilters: Float32Array | null = null
let dft: { cos: Float32Array; sin: Float32Array } | null = null
const hann = Float32Array.from({ length: N_FFT }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N_FFT))

/** librosa's slaney mel filterbank (what Whisper was trained with): N_MELS × 201 */
function filters(): Float32Array {
  if (melFilters) return melFilters
  const bins = N_FFT / 2 + 1
  const fSp = 200 / 3
  const minLogHz = 1000
  const minLogMel = minLogHz / fSp
  const logStep = Math.log(6.4) / 27
  const hzToMel = (f: number) => (f < minLogHz ? f / fSp : minLogMel + Math.log(f / minLogHz) / logStep)
  const melToHz = (m: number) => (m < minLogMel ? m * fSp : minLogHz * Math.exp(logStep * (m - minLogMel)))
  const top = hzToMel(SR / 2)
  const melF = Array.from({ length: N_MELS + 2 }, (_, i) => melToHz((top * i) / (N_MELS + 1)))
  const fft = Array.from({ length: bins }, (_, i) => (i * SR) / N_FFT)
  const w = new Float32Array(N_MELS * bins)
  for (let m = 0; m < N_MELS; m++) {
    const enorm = 2 / (melF[m + 2] - melF[m])
    for (let k = 0; k < bins; k++) {
      const lower = (fft[k] - melF[m]) / (melF[m + 1] - melF[m])
      const upper = (melF[m + 2] - fft[k]) / (melF[m + 2] - melF[m + 1])
      w[m * bins + k] = Math.max(0, Math.min(lower, upper)) * enorm
    }
  }
  melFilters = w
  return w
}

function tables() {
  if (dft) return dft
  const bins = N_FFT / 2 + 1
  const cos = new Float32Array(bins * N_FFT)
  const sin = new Float32Array(bins * N_FFT)
  for (let k = 0; k < bins; k++)
    for (let n = 0; n < N_FFT; n++) {
      const a = (2 * Math.PI * k * n) / N_FFT
      cos[k * N_FFT + n] = Math.cos(a)
      sin[k * N_FFT + n] = Math.sin(a)
    }
  dft = { cos, sin }
  return dft
}

/** 30 s of 16 kHz audio (zero-padded) → [80 × 3000] log-mel features, like WhisperFeatureExtractor. */
function logMel(audio: Float32Array): Float32Array {
  const bins = N_FFT / 2 + 1
  const pad = N_FFT / 2
  // reflect-pad the 30 s window by 200 samples on each side (torch.stft center=True)
  const padded = new Float32Array(CHUNK + 2 * pad)
  padded.set(audio.subarray(0, CHUNK), pad)
  for (let i = 0; i < pad; i++) {
    padded[pad - 1 - i] = padded[pad + 1 + i]
    padded[pad + CHUNK + i] = padded[pad + CHUNK - 2 - i]
  }
  const { cos, sin } = tables()
  const mel = filters()
  const out = new Float32Array(N_MELS * FRAMES)
  const power = new Float32Array(bins)
  const frame = new Float32Array(N_FFT)
  // frames past the recording are silent: their power is 0, so skip the transform
  const lastAudible = Math.min(FRAMES, Math.ceil((audio.length + pad) / HOP) + 1)
  let max = -Infinity
  for (let t = 0; t < FRAMES; t++) {
    if (t < lastAudible) {
      for (let n = 0; n < N_FFT; n++) frame[n] = padded[t * HOP + n] * hann[n]
      for (let k = 0; k < bins; k++) {
        let re = 0
        let im = 0
        const o = k * N_FFT
        for (let n = 0; n < N_FFT; n++) {
          re += frame[n] * cos[o + n]
          im -= frame[n] * sin[o + n]
        }
        power[k] = re * re + im * im
      }
    } else power.fill(0)
    for (let m = 0; m < N_MELS; m++) {
      let s = 0
      const o = m * bins
      for (let k = 0; k < bins; k++) s += mel[o + k] * power[k]
      const v = Math.log10(Math.max(s, 1e-10))
      out[m * FRAMES + t] = v
      if (v > max) max = v
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = (Math.max(out[i], max - 8) + 4) / 4
  return out
}

// ── text: byte-level BPE back to UTF-8 ───────────────────────────────────────

let byteOf: Map<string, number> | null = null
function bytesToUnicode(): Map<string, number> {
  if (byteOf) return byteOf
  const bs: number[] = []
  for (let b = 33; b <= 126; b++) bs.push(b)
  for (let b = 161; b <= 172; b++) bs.push(b)
  for (let b = 174; b <= 255; b++) bs.push(b)
  const cs = [...bs]
  let n = 0
  for (let b = 0; b < 256; b++)
    if (!bs.includes(b)) {
      bs.push(b)
      cs.push(256 + n++)
    }
  byteOf = new Map(bs.map((b, i) => [String.fromCharCode(cs[i]), b]))
  return byteOf
}

function detokenize(ids: number[], tokens: string[]): string {
  const map = bytesToUnicode()
  const bytes: number[] = []
  for (const id of ids) {
    if (id >= EOT) continue
    for (const ch of tokens[id] ?? '') {
      const b = map.get(ch)
      if (b !== undefined) bytes.push(b)
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

// ── decoding ─────────────────────────────────────────────────────────────────

const argmax = (a: Float32Array, from: number, len: number) => {
  let best = -Infinity
  let at = 0
  for (let i = 0; i < len; i++)
    if (a[from + i] > best) {
      best = a[from + i]
      at = i
    }
  return at
}

/** One 30 s window → text (greedy, with the language detected from the audio). */
async function window30(m: Model, audio: Float32Array, lang?: number): Promise<{ text: string; lang: number }> {
  const { ort } = m
  const features = new ort.Tensor('float32', logMel(audio), [1, N_MELS, FRAMES])
  const enc = await m.encoder.run({ [m.encoder.inputNames[0]]: features })
  const hidden = enc[m.encoder.outputNames[0]]

  const ids = (xs: number[]) => new ort.Tensor('int64', BigInt64Array.from(xs, (x) => BigInt(x)), [1, xs.length])
  const empty = () => new ort.Tensor('float32', new Float32Array(0), [1, m.heads, 0, m.headDim])
  let past: Record<string, Tensor> = {}
  const crossKv: Record<string, Tensor> = {}
  const step = async (input: number[]): Promise<Float32Array> => {
    const cached = Object.keys(past).length > 0
    const feeds: Record<string, Tensor> = {}
    for (const name of m.decoder.inputNames) {
      if (name === 'input_ids') feeds[name] = ids(input)
      else if (name === 'encoder_hidden_states') feeds[name] = hidden
      else if (name === 'use_cache_branch') feeds[name] = new ort.Tensor('bool', [cached], [1])
      else if (name.startsWith('past_key_values.')) feeds[name] = (name.includes('.encoder.') ? crossKv[name] : past[name]) ?? empty()
    }
    const out = await m.decoder.run(feeds)
    const next: Record<string, Tensor> = {}
    for (const name of m.decoder.outputNames) {
      if (!name.startsWith('present.')) continue
      const key = name.replace('present.', 'past_key_values.')
      // the cross-attention cache is made once, on the first step
      if (name.includes('.encoder.')) {
        if (!cached) crossKv[key] = out[name]
      } else next[key] = out[name]
    }
    past = next
    const logits = out[m.decoder.outputNames[0]]
    const vocab = logits.dims[2]
    const all = logits.data as Float32Array
    return all.subarray((logits.dims[1] - 1) * vocab, logits.dims[1] * vocab)
  }

  // language: what Whisper thinks it hears after <|startoftranscript|>
  let logits = await step([SOT])
  if (lang === undefined) lang = FIRST_LANG + argmax(logits, FIRST_LANG, LAST_LANG - FIRST_LANG + 1)
  logits = await step([lang, TRANSCRIBE, NO_TIMESTAMPS])

  const out: number[] = []
  const blocked = new Set(m.suppress)
  for (let i = 0; i < MAX_TOKENS; i++) {
    const l = Float32Array.from(logits)
    for (const id of blocked) l[id] = -Infinity
    if (i === 0) for (const id of m.beginSuppress) l[id] = -Infinity
    for (let id = EOT + 1; id < l.length; id++) l[id] = -Infinity
    const next = argmax(l, 0, l.length)
    if (next === EOT) break
    out.push(next)
    // stop a hallucination loop: the last 8 tokens repeat the 8 before
    const n = out.length
    if (n >= 24 && out.slice(n - 8).every((t, k) => t === out[n - 16 + k])) {
      out.length = n - 8
      break
    }
    logits = await step([next])
  }
  return { text: detokenize(out, m.tokens).trim(), lang }
}

export interface Transcript {
  text: string
  /** language code Whisper detected, e.g. "en" */
  lang: string
  seconds: number
  ms: number
}

/** Speech (16 kHz mono) → text, entirely in this browser. */
export async function transcribe(audio: Float32Array): Promise<Transcript> {
  const t0 = performance.now()
  const m = await loadVoice()
  const seconds = audio.length / SR
  // near-silence makes Whisper invent text: say so instead
  let energy = 0
  for (let i = 0; i < audio.length; i++) energy += audio[i] * audio[i]
  if (!audio.length || Math.sqrt(energy / audio.length) < 0.004) return { text: '', lang: '', seconds, ms: performance.now() - t0 }
  const parts: string[] = []
  let lang: number | undefined
  for (let at = 0; at < audio.length; at += CHUNK) {
    const r = await window30(m, audio.subarray(at, at + CHUNK), lang)
    lang = r.lang
    if (r.text) parts.push(r.text)
  }
  return { text: parts.join(' ').replace(/\s+/g, ' ').trim(), lang: m.langs.get(lang ?? -1) ?? '', seconds, ms: performance.now() - t0 }
}

/** Any recorded/encoded audio → 16 kHz mono samples. */
export async function toMono16k(blob: Blob): Promise<Float32Array> {
  const data = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(data)
    const length = Math.ceil(decoded.duration * SR)
    if (!length) return new Float32Array(0)
    const off = new OfflineAudioContext(1, length, SR)
    const src = off.createBufferSource()
    src.buffer = decoded
    src.connect(off.destination)
    src.start()
    return (await off.startRendering()).getChannelData(0)
  } finally {
    void ctx.close()
  }
}

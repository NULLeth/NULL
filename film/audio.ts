// The launch film's sound, synthesised offline (OfflineAudioContext): a dark, quiet pad,
// soft typing ticks, a pulse under the problem, the arrival of ∅, and a tick per step.
// Rendered only into the MP4 — nothing here ever plays through the speakers.

import { CHAT_CUES, CHAT_DURATION } from './chat'
import { HOW_CUES, HOW_DURATION } from './how'
import { CUE, DURATION, typingTimes } from './launch'

export type Soundtrack = (ctx: OfflineAudioContext, out: AudioNode) => void

const SAMPLE_RATE = 48_000

function noise(ctx: OfflineAudioContext, seconds: number, seed = 22222): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let s = seed
  for (let i = 0; i < data.length; i++) {
    s = (s * 16807) % 2147483647
    data[i] = (s / 2147483647) * 2 - 1
  }
  return buffer
}

/** Low thump. */
function hit(ctx: OfflineAudioContext, out: AudioNode, at: number, level = 0.8, from = 120, to = 44, length = 0.38) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(from, at)
  osc.frequency.exponentialRampToValueAtTime(to, at + 0.13)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(level, at + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(out)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

/** Short bright tick. */
function tick(ctx: OfflineAudioContext, out: AudioNode, at: number, frequency: number, level = 0.12, length = 0.18) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(frequency, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(level, at + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(out)
  osc.start(at)
  osc.stop(at + length + 0.04)
}

/** A key-click: a few ms of high-passed noise. */
function click(ctx: OfflineAudioContext, out: AudioNode, at: number, level: number, seed: number) {
  const src = ctx.createBufferSource()
  src.buffer = noise(ctx, 0.03, seed)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2800
  const g = ctx.createGain()
  g.gain.setValueAtTime(level, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.025)
  src.connect(hp).connect(g).connect(out)
  src.start(at)
  src.stop(at + 0.03)
}

/** Filtered noise sweep (riser / swipe). */
function sweep(ctx: OfflineAudioContext, out: AudioNode, from: number, to: number, f0: number, f1: number, level: number, q = 1.2) {
  const source = ctx.createBufferSource()
  source.buffer = noise(ctx, to - from + 0.1)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(f0, from)
  filter.frequency.exponentialRampToValueAtTime(f1, to)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, from)
  gain.gain.exponentialRampToValueAtTime(level, to - 0.02)
  gain.gain.linearRampToValueAtTime(0, to)
  source.connect(filter).connect(gain).connect(out)
  source.start(from)
  source.stop(to + 0.05)
}

/** The bed: a soft minor chord through a slowly breathing low-pass. */
function pad(ctx: OfflineAudioContext, out: AudioNode, from: number, to: number, swells: number[]) {
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 0.6
  filter.frequency.setValueAtTime(380, from)
  for (const s of swells) {
    filter.frequency.setTargetAtTime(1400, s, 0.25)
    filter.frequency.setTargetAtTime(520, s + 1.6, 1.2)
  }
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, from)
  gain.gain.exponentialRampToValueAtTime(0.22, from + 3)
  gain.gain.setValueAtTime(0.22, to - 2.5)
  gain.gain.linearRampToValueAtTime(0.0001, to)
  // A minor (add9): A2 E3 G3 B3 E4, each voice slightly detuned for width
  for (const f of [110, 164.81, 196, 246.94, 329.63]) {
    for (const d of [-6, 6]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      osc.detune.value = d
      const v = ctx.createGain()
      v.gain.value = f < 150 ? 0.16 : 0.09
      osc.connect(v).connect(filter)
      osc.start(from)
      osc.stop(to + 0.05)
    }
  }
  filter.connect(gain).connect(out)
}

/** ∅ arriving: a deep boom, air rushing out, and a bright fifth on top. */
function arrival(ctx: OfflineAudioContext, out: AudioNode, at: number, level = 1) {
  hit(ctx, out, at, 0.95 * level, 86, 30, 1.9)
  const source = ctx.createBufferSource()
  source.buffer = noise(ctx, 1.6, 4242)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(8000, at)
  filter.frequency.exponentialRampToValueAtTime(180, at + 1.4)
  const wash = ctx.createGain()
  wash.gain.setValueAtTime(0.32 * level, at)
  wash.gain.exponentialRampToValueAtTime(0.0001, at + 1.5)
  source.connect(filter).connect(wash).connect(out)
  source.start(at)
  source.stop(at + 1.6)
  for (const [f, l] of [
    [659.25, 0.05],
    [987.77, 0.03],
  ] as const) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(l * level, at + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.6)
    osc.connect(g).connect(out)
    osc.start(at)
    osc.stop(at + 2.7)
  }
}

export const launchSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, DURATION, [CUE.arrival, CUE.end + 0.2])

  // 1 · typing
  typingTimes().forEach((at, i) => click(ctx, out, at, 0.12 + (i % 3) * 0.02, 1000 + i * 17))

  // 2 · the problem: a slow pulse, then a riser into the cut
  for (let at = CUE.problem + 0.4; at < CUE.cut - 0.6; at += 1.0) hit(ctx, out, at, 0.32, 90, 42, 0.5)
  sweep(ctx, out, CUE.cut - 1.7, CUE.cut, 300, 5200, 0.16)

  // 3 · the cut and ∅
  sweep(ctx, out, CUE.cut, CUE.cut + 0.38, 6000, 900, 0.22, 0.8)
  arrival(ctx, out, CUE.arrival)

  // 4 · how it works: one rising tick per node, a soft hit for the results
  const notes = [880, 987.77, 1174.66, 1318.51, 1567.98]
  CUE.nodes.forEach((at, i) => tick(ctx, out, at, notes[i], 0.13))
  CUE.results.forEach((at) => hit(ctx, out, at, 0.35, 140, 60, 0.4))

  // 5 · the product: typing the prompt, the send, a tick per step
  for (let i = 0; i < 26; i++) click(ctx, out, 24.8 + (1.2 * i) / 26, 0.08, 3000 + i * 13)
  tick(ctx, out, CUE.send, 1318.51, 0.12)
  CUE.steps.forEach((at, i) => tick(ctx, out, at, notes[i + 1], 0.1))
  hit(ctx, out, CUE.steps[3], 0.3, 120, 50, 0.35)

  // 6 · end card
  arrival(ctx, out, CUE.end + 0.2, 0.75)
}

/** The explainer: the same quiet bed, a soft chime per step and small marks for each event. */
export const howSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, HOW_DURATION, [1.2, HOW_CUES.end])
  arrival(ctx, out, 1.2, 0.55)
  const chime = [659.25, 739.99, 830.61, 987.77, 1108.73, 1318.51]
  HOW_CUES.steps.forEach((at, i) => {
    tick(ctx, out, at + 0.25, chime[i], 0.1, 0.5)
    hit(ctx, out, at + 0.25, 0.22, 110, 50, 0.4)
  })
  sweep(ctx, out, 5.2, HOW_CUES.depositLand, 400, 2400, 0.08)
  tick(ctx, out, HOW_CUES.leaf, 1567.98, 0.1)
  sweep(ctx, out, HOW_CUES.blend - 0.4, HOW_CUES.blend + 1.2, 3000, 500, 0.06)
  HOW_CUES.proofLines.forEach((at, i) => tick(ctx, out, at, 880 + i * 110, 0.08))
  tick(ctx, out, HOW_CUES.nullifier, 1318.51, 0.09)
  ;[0, 0.35, 0.7].forEach((d) => tick(ctx, out, HOW_CUES.verify + d, 1174.66, 0.08))
  hit(ctx, out, HOW_CUES.key, 0.3, 140, 60, 0.4)
  sweep(ctx, out, HOW_CUES.send, HOW_CUES.send + 1.6, 500, 3000, 0.06)
  tick(ctx, out, HOW_CUES.receipt, 987.77, 0.1)
  hit(ctx, out, HOW_CUES.honest, 0.25, 120, 50, 0.4)
  arrival(ctx, out, HOW_CUES.end, 0.7)
}

/** NULL Chat promo: quiet bed, the logo, typing, a tick per step, a mark per point. */
export const chatSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, CHAT_DURATION, [1.0, CHAT_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  const n = 39
  for (let i = 0; i < n; i++) click(ctx, out, CHAT_CUES.typeStart + ((CHAT_CUES.typeEnd - CHAT_CUES.typeStart) * i) / n, 0.09, 5000 + i * 11)
  tick(ctx, out, CHAT_CUES.send, 1318.51, 0.12)
  CHAT_CUES.steps.forEach((at, i) => tick(ctx, out, at, [987.77, 1174.66, 1318.51][i], 0.1))
  CHAT_CUES.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, CHAT_CUES.end + 0.1, 0.7)
}

/** Renders a soundtrack, levelled so its loudest moment sits just under full scale. */
export async function renderSound(sound: Soundtrack, duration: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE)
  const master = ctx.createGain()
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -14
  glue.ratio.value = 3
  glue.attack.value = 0.004
  glue.release.value = 0.22
  master.connect(glue).connect(ctx.destination)
  sound(ctx, master)
  const buffer = await ctx.startRendering()

  let loudest = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) loudest = Math.max(loudest, Math.abs(data[i]))
  }
  const scale = loudest > 0 ? Math.min(4, 0.8 / loudest) : 1
  const fade = Math.floor(0.2 * SAMPLE_RATE)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      const left = data.length - i
      data[i] *= scale * (left < fade ? left / fade : 1)
    }
  }
  return buffer
}

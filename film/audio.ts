// The launch film's sound, synthesised offline (OfflineAudioContext): a dark, quiet pad,
// soft typing ticks, a pulse under the problem, the arrival of ∅, and a tick per step.
// Rendered only into the MP4 — nothing here ever plays through the speakers.

import { CHAT_CUES, CHAT_DURATION } from './chat'
import { HOW_CUES, HOW_DURATION } from './how'
import { CUE, DURATION, typingTimes } from './launch'
import { WEB_CUES, WEB_DURATION } from './web'
import { MODELS_CUES, MODELS_DURATION } from './models'
import { IMAGE_CUES, IMAGE_DURATION } from './image'
import { TOR_CUES, TOR_DURATION } from './tor'
import { SHIELD_CUES, SHIELD_DURATION } from './shield'
import { COMPARE_CUES, COMPARE_DURATION } from './compare'
import { AGENTS_CUES, AGENTS_DURATION } from './agents'
import { AISHIELD_CUES, AISHIELD_DURATION } from './aishield'
import { FILES_CUES, FILES_DURATION } from './files'
import { VOICE_CUES, VOICE_DURATION } from './voice'
import { FACES_CUES, FACES_DURATION } from './faces'
import { SCREENSHOT_CUES, SCREENSHOT_DURATION } from './screenshot'
import { BACKUP_CUES, BACKUP_DURATION } from './backup'
import { RESEARCH_CUES, RESEARCH_DURATION } from './research'
import { WEEK_CUES, WEEK_DURATION } from './week'

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

/** Web search promo: the switch, typing, the proof steps, a soft search sweep, one tick per source. */
export const webSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, WEB_DURATION, [1.0, WEB_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  tick(ctx, out, WEB_CUES.toggle, 1174.66, 0.13)
  const n = 37
  for (let i = 0; i < n; i++) click(ctx, out, WEB_CUES.typeStart + ((WEB_CUES.typeEnd - WEB_CUES.typeStart) * i) / n, 0.09, 6000 + i * 13)
  tick(ctx, out, WEB_CUES.send, 1318.51, 0.12)
  WEB_CUES.steps.forEach((at, i) => tick(ctx, out, at, [987.77, 1174.66, 1318.51][i], 0.1))
  sweep(ctx, out, WEB_CUES.steps[1], WEB_CUES.steps[2], 400, 2400, 0.045)
  WEB_CUES.sources.forEach((at, i) => tick(ctx, out, at, [1318.51, 1479.98, 1661.22, 1760][i], 0.08))
  WEB_CUES.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, WEB_CUES.end + 0.1, 0.7)
}

/** Models promo: a soft tick per model card, a hit as they wire into one balance, the picker, typing. */
export const modelsSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, MODELS_DURATION, [1.0, MODELS_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  const scale = [880, 987.77, 1108.73, 1174.66, 1318.51, 1479.98]
  MODELS_CUES.cards.forEach((at, i) => tick(ctx, out, at, scale[i % scale.length], 0.06))
  hit(ctx, out, MODELS_CUES.pill, 0.45, 120, 46, 0.45)
  sweep(ctx, out, MODELS_CUES.pill, MODELS_CUES.pill + 0.9, 300, 2200, 0.04)
  tick(ctx, out, MODELS_CUES.open, 987.77, 0.1)
  for (let i = 0; i < 6; i++) tick(ctx, out, MODELS_CUES.moveStart + ((MODELS_CUES.moveEnd - MODELS_CUES.moveStart) * i) / 6, 1760, 0.035, 0.08)
  tick(ctx, out, MODELS_CUES.select, 1318.51, 0.12)
  const n = 30
  for (let i = 0; i < n; i++) click(ctx, out, MODELS_CUES.typeStart + ((MODELS_CUES.typeEnd - MODELS_CUES.typeStart) * i) / n, 0.09, 7000 + i * 17)
  tick(ctx, out, MODELS_CUES.send, 1318.51, 0.12)
  MODELS_CUES.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, MODELS_CUES.end + 0.1, 0.7)
}

/** Image promo: the switch, typing, proof steps, a rising sweep as each picture develops. */
export const imageSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, IMAGE_DURATION, [1.0, IMAGE_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  tick(ctx, out, IMAGE_CUES.toggle, 1174.66, 0.13)
  tick(ctx, out, IMAGE_CUES.aspect, 1318.51, 0.08)
  const n = 40
  for (let i = 0; i < n; i++) click(ctx, out, IMAGE_CUES.typeStart + ((IMAGE_CUES.typeEnd - IMAGE_CUES.typeStart) * i) / n, 0.09, 8000 + i * 19)
  tick(ctx, out, IMAGE_CUES.send, 1318.51, 0.12)
  IMAGE_CUES.steps.slice(0, 2).forEach((at, i) => tick(ctx, out, at, [987.77, 1174.66][i], 0.1))
  sweep(ctx, out, IMAGE_CUES.steps[1], IMAGE_CUES.reveal[1], 250, 2600, 0.05)
  arrival(ctx, out, IMAGE_CUES.reveal[0] + 0.1, 0.45)
  const m = 15
  for (let i = 0; i < m; i++) click(ctx, out, IMAGE_CUES.editTypeStart + ((IMAGE_CUES.editTypeEnd - IMAGE_CUES.editTypeStart) * i) / m, 0.09, 9000 + i * 23)
  tick(ctx, out, IMAGE_CUES.editSend, 1318.51, 0.12)
  sweep(ctx, out, IMAGE_CUES.editSend + 0.2, IMAGE_CUES.reveal2[1], 300, 3000, 0.05)
  arrival(ctx, out, IMAGE_CUES.reveal2[0] + 0.1, 0.45)
  IMAGE_CUES.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, IMAGE_CUES.end + 0.1, 0.7)
}

/** Tor promo: a sweep per packet, a tick at each relay, the click, the check turning green. */
export const torSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, TOR_DURATION, [1.0, TOR_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  sweep(ctx, out, TOR_CUES.row1[0], TOR_CUES.row1[1], 300, 1800, 0.045)
  hit(ctx, out, TOR_CUES.row1[1], 0.25, 160, 70, 0.3)
  sweep(ctx, out, TOR_CUES.row2[0], TOR_CUES.row2[1], 300, 2400, 0.045)
  TOR_CUES.hops.forEach((at, i) => tick(ctx, out, at, [987.77, 1174.66, 1318.51][i], 0.1))
  tick(ctx, out, TOR_CUES.row2[1], 1479.98, 0.11)
  tick(ctx, out, TOR_CUES.click, 1174.66, 0.12)
  tick(ctx, out, TOR_CUES.checking, 987.77, 0.08)
  arrival(ctx, out, TOR_CUES.green, 0.45)
  tick(ctx, out, TOR_CUES.chip, 1318.51, 0.1)
  TOR_CUES.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, TOR_CUES.end + 0.1, 0.7)
}

/** Shield promo: typing, a tick per detected detail, the swap to placeholders, the fill-back, three layer checks. */
export const shieldSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, SHIELD_DURATION, [1.0, SHIELD_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  const n = 48
  for (let i = 0; i < n; i++) click(ctx, out, SHIELD_CUES.typeStart + ((SHIELD_CUES.typeEnd - SHIELD_CUES.typeStart) * i) / n, 0.08, 10000 + i * 29)
  SHIELD_CUES.chips.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  sweep(ctx, out, SHIELD_CUES.panel[0], SHIELD_CUES.panel[1], 400, 2200, 0.04)
  tick(ctx, out, SHIELD_CUES.send, 1318.51, 0.12)
  SHIELD_CUES.morph.forEach((at, i) => tick(ctx, out, at, [1479.98, 1661.22, 1760][i], 0.1))
  SHIELD_CUES.layers.forEach((at) => hit(ctx, out, at, 0.32, 130, 55, 0.4))
  arrival(ctx, out, SHIELD_CUES.end + 0.1, 0.7)
}

/** Compare promo: the switch, typing, two streams, a tick as each cost appears. */
export const compareSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, COMPARE_DURATION, [1.0, COMPARE_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  tick(ctx, out, COMPARE_CUES.toggle, 1174.66, 0.13)
  const n = 34
  for (let i = 0; i < n; i++) click(ctx, out, COMPARE_CUES.typeStart + ((COMPARE_CUES.typeEnd - COMPARE_CUES.typeStart) * i) / n, 0.09, 11000 + i * 31)
  tick(ctx, out, COMPARE_CUES.send, 1318.51, 0.12)
  sweep(ctx, out, COMPARE_CUES.streamB[0], COMPARE_CUES.streamA[1], 300, 2000, 0.035)
  tick(ctx, out, COMPARE_CUES.streamB[1], 1479.98, 0.11)
  tick(ctx, out, COMPARE_CUES.streamA[1], 1661.22, 0.11)
  COMPARE_CUES.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, COMPARE_CUES.end + 0.1, 0.7)
}

/** Agent Kit promo: typing in the terminal, a tick per hop of the request, rows landing on the dashboard. */
export const agentsSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, AGENTS_DURATION, [1.0, AGENTS_CUES.end])
  arrival(ctx, out, 1.0, 0.55)
  for (const [a, b] of [AGENTS_CUES.cmd1, AGENTS_CUES.cmd2]) {
    const n = Math.round((b - a) * 22)
    for (let i = 0; i < n; i++) click(ctx, out, a + ((b - a) * i) / n, 0.08, 12000 + Math.round(a * 100) + i * 37)
  }
  tick(ctx, out, AGENTS_CUES.out1, 1318.51, 0.11)
  tick(ctx, out, AGENTS_CUES.out2, 1479.98, 0.11)
  sweep(ctx, out, AGENTS_CUES.hops[0], AGENTS_CUES.hops[4] + 0.4, 300, 2400, 0.04)
  AGENTS_CUES.hops.forEach((at, i) => tick(ctx, out, at + 0.4, [987.77, 1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  arrival(ctx, out, AGENTS_CUES.hops[4] + 1.2, 0.4)
  for (let i = 0; i < 4; i++) tick(ctx, out, AGENTS_CUES.dash[0] + 0.5 + i * 0.25, 1174.66 + i * 120, 0.07)
  arrival(ctx, out, AGENTS_CUES.end + 0.1, 0.7)
}

/** Stats update: the logo, one tick per number, a soft hit for the closing line. */
/** AI Shield promo: typing, the switch, a rising sweep while the model loads, a tick per name found, the hops. */
export const aiShieldSound: Soundtrack = (ctx, out) => {
  const K = AISHIELD_CUES
  pad(ctx, out, 0, AISHIELD_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  const n = 40
  for (let i = 0; i < n; i++) click(ctx, out, K.typeStart + ((K.typeEnd - K.typeStart) * i) / n, 0.08, 13000 + i * 41)
  tick(ctx, out, K.patterns + 0.5, 880, 0.08)
  tick(ctx, out, K.click, 1174.66, 0.13)
  sweep(ctx, out, K.click + 0.1, K.ready, 300, 2400, 0.045)
  tick(ctx, out, K.ready, 1760, 0.12)
  K.chips.forEach((at, i) => tick(ctx, out, at, [1318.51, 1479.98, 1661.22][i], 0.1))
  sweep(ctx, out, K.panel[0], K.panel[1], 400, 2200, 0.035)
  K.hops.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98][i], 0.1))
  K.stats.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Private Files promo: the drop, a tick per file ready and per detail removed or swapped, typing, the answer. */
export const filesSound: Soundtrack = (ctx, out) => {
  const K = FILES_CUES
  pad(ctx, out, 0, FILES_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  sweep(ctx, out, K.drag[0], K.drag[1], 300, 1400, 0.03)
  hit(ctx, out, K.drag[1], 0.25, 140, 60, 0.3)
  K.ready.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51][i], 0.1))
  K.rows.forEach((at) => tick(ctx, out, at, 987.77, 0.07))
  sweep(ctx, out, K.redraw[0], K.redraw[1], 400, 2400, 0.04)
  K.removed.forEach((at, i) => tick(ctx, out, at, [1318.51, 1479.98, 1661.22][i], 0.1))
  K.swaps.forEach((at, i) => tick(ctx, out, at, 1174.66 + i * 90, 0.08))
  const n = 22
  for (let i = 0; i < n; i++) click(ctx, out, K.typeStart + ((K.typeEnd - K.typeStart) * i) / n, 0.08, 14000 + i * 43)
  tick(ctx, out, K.send, 1318.51, 0.12)
  K.morph.forEach((at, i) => tick(ctx, out, at, [1479.98, 1661.22][i], 0.1))
  K.points.forEach((at) => hit(ctx, out, at, 0.3, 130, 55, 0.4))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Private Voice promo: the cloud whoosh, the mic click, a soft rising sweep while recording, Whisper's steps, the hops. */
export const voiceSound: Soundtrack = (ctx, out) => {
  const K = VOICE_CUES
  pad(ctx, out, 0, VOICE_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  sweep(ctx, out, K.cloud[0] + 0.6, K.cloud[1] - 0.4, 200, 1600, 0.03)
  tick(ctx, out, K.click, 1174.66, 0.13)
  sweep(ctx, out, K.click + 0.3, K.speakEnd, 300, 900, 0.025)
  tick(ctx, out, K.stop, 1318.51, 0.12)
  sweep(ctx, out, K.whisper[0], K.whisper[1], 500, 2600, 0.04)
  for (let i = 0; i < 3; i++) tick(ctx, out, K.whisper[0] + 0.6 + i * 0.25, [1318.51, 1479.98, 1661.22][i], 0.08)
  const n = 20
  for (let i = 0; i < n; i++) click(ctx, out, K.typed[0] + ((K.typed[1] - K.typed[0]) * i) / n, 0.06, 15000 + i * 47)
  tick(ctx, out, K.shield, 1760, 0.1)
  hit(ctx, out, K.leaves[1], 0.28, 130, 55, 0.4)
  K.hops.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Face Shield promo: the drop, the detector sweep, a tick per face, the blur, the toggle, the answer. */
export const facesSound: Soundtrack = (ctx, out) => {
  const K = FACES_CUES
  pad(ctx, out, 0, FACES_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  sweep(ctx, out, K.drag[0], K.drag[1], 300, 1400, 0.03)
  hit(ctx, out, K.drag[1], 0.25, 140, 60, 0.3)
  sweep(ctx, out, K.scan[0], K.scan[1], 600, 2400, 0.04)
  K.boxes.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.1))
  sweep(ctx, out, K.blur[0], K.blur[1] + 0.4, 2400, 300, 0.035)
  tick(ctx, out, K.off, 880, 0.1)
  tick(ctx, out, K.on, 1318.51, 0.1)
  const n = 22
  for (let i = 0; i < n; i++) click(ctx, out, K.typeStart + ((K.typeEnd - K.typeStart) * i) / n, 0.08, 16000 + i * 53)
  tick(ctx, out, K.send, 1318.51, 0.12)
  K.hops.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Screenshot Shield promo: the drop, the OCR sweep, a tick per detail found, a thud per box, the answer. */
export const screenshotSound: Soundtrack = (ctx, out) => {
  const K = SCREENSHOT_CUES
  pad(ctx, out, 0, SCREENSHOT_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  sweep(ctx, out, K.drag[0], K.drag[1], 300, 1400, 0.03)
  hit(ctx, out, K.drag[1], 0.25, 140, 60, 0.3)
  sweep(ctx, out, K.ocr[0], K.ocr[1], 500, 2600, 0.04)
  K.found.forEach((at, i) => tick(ctx, out, at, [987.77, 1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  K.cover.forEach((at) => hit(ctx, out, at + 0.05, 0.18, 160, 70, 0.18))
  const n = 26
  for (let i = 0; i < n; i++) click(ctx, out, K.typeStart + ((K.typeEnd - K.typeStart) * i) / n, 0.08, 17000 + i * 59)
  tick(ctx, out, K.send, 1318.51, 0.12)
  K.hops.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Encrypted Backup promo: clicks through the dialog, a slow sweep while Argon2id works, the seal, the restore. */
export const backupSound: Soundtrack = (ctx, out) => {
  const K = BACKUP_CUES
  pad(ctx, out, 0, BACKUP_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  tick(ctx, out, K.problem[0] + 1.6, 880, 0.08)
  tick(ctx, out, K.open, 1174.66, 0.12)
  for (let i = 0; i < 12; i++) click(ctx, out, K.generate + i * 0.03, 0.06, 18000 + i * 61)
  tick(ctx, out, K.tick, 1318.51, 0.1)
  tick(ctx, out, K.download, 1479.98, 0.12)
  sweep(ctx, out, K.kdf[0], K.kdf[1], 200, 900, 0.04)
  sweep(ctx, out, K.encrypt[0], K.encrypt[1], 900, 2600, 0.04)
  hit(ctx, out, K.saved, 0.3, 130, 55, 0.4)
  tick(ctx, out, K.pick, 1174.66, 0.1)
  const n = 20
  for (let i = 0; i < n; i++) click(ctx, out, K.pass[0] + ((K.pass[1] - K.pass[0]) * i) / n, 0.07, 19000 + i * 67)
  hit(ctx, out, K.restored, 0.3, 130, 55, 0.4)
  K.points.forEach((at) => hit(ctx, out, at, 0.28, 130, 55, 0.4))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Private Deep Research promo: the switch, typing, a tick per search sent and per search back, the report, the hops. */
export const researchSound: Soundtrack = (ctx, out) => {
  const K = RESEARCH_CUES
  pad(ctx, out, 0, RESEARCH_DURATION, [1.0, K.end])
  arrival(ctx, out, 1.0, 0.55)
  tick(ctx, out, K.toggle, 1174.66, 0.13)
  const n = 40
  for (let i = 0; i < n; i++) click(ctx, out, K.typeStart + ((K.typeEnd - K.typeStart) * i) / n, 0.08, 20000 + i * 71)
  tick(ctx, out, K.send, 1318.51, 0.12)
  tick(ctx, out, K.plan, 987.77, 0.1)
  K.searches.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.08))
  sweep(ctx, out, K.searches[0], K.found[3], 300, 2400, 0.035)
  K.found.forEach((at, i) => tick(ctx, out, at, [1318.51, 1479.98, 1661.22, 1760][i], 0.1))
  sweep(ctx, out, K.streamStart, K.streamEnd, 500, 1800, 0.025)
  hit(ctx, out, K.sources, 0.28, 130, 55, 0.4)
  K.hops.forEach((at, i) => tick(ctx, out, at, [1174.66, 1318.51, 1479.98, 1661.22][i], 0.09))
  arrival(ctx, out, K.end + 0.1, 0.7)
}

/** Week recap: a rising tick per card, a hit for the idea, the arrival at the end. */
export const weekSound: Soundtrack = (ctx, out) => {
  const K = WEEK_CUES
  pad(ctx, out, 0, WEEK_DURATION, [1.0, K.idea[0], K.end])
  arrival(ctx, out, 1.0, 0.55)
  K.cards.forEach((at, i) => {
    tick(ctx, out, at, [987.77, 1108.73, 1174.66, 1318.51, 1479.98, 1661.22, 1760][i], 0.1)
    hit(ctx, out, at, 0.16, 140, 60, 0.25)
  })
  hit(ctx, out, K.idea[0] + 0.2, 0.32, 130, 55, 0.45)
  tick(ctx, out, K.idea[0] + 1.0, 1760, 0.12)
  arrival(ctx, out, K.end + 0.1, 0.7)
}

export const statsSound: Soundtrack = (ctx, out) => {
  pad(ctx, out, 0, 16, [1.0, 12.4])
  arrival(ctx, out, 1.0, 0.5)
  ;[3.3, 3.8, 4.3, 4.8].forEach((at, i) => tick(ctx, out, at, [880, 987.77, 1174.66, 1318.51][i], 0.11))
  sweep(ctx, out, 4.4, 8.4, 300, 2600, 0.05)
  arrival(ctx, out, 12.5, 0.65)
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

import { useEffect, useState } from 'react'

/**
 * Private Read Aloud: answers are read out by a voice that runs on this device.
 *
 * Browsers offer two kinds of voices through the Web Speech API: ones the operating system
 * speaks locally, and cloud voices (Chrome's "Google …", Edge's "… Online (Natural)") that send
 * the text to a server to turn it into sound. Only voices with `localService === true` are ever
 * used here; cloud voices are listed as hidden so people can see why.
 */

const KEY = 'null.readaloud.v1'

export interface ReadAloudSettings {
  /** voiceURI of the chosen on-device voice (falls back to the best match) */
  voice?: string
  rate: number
  /** read each new answer aloud when it is done */
  auto: boolean
}

export function loadReadAloud(): ReadAloudSettings {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ReadAloudSettings> | null
    if (j) return { voice: typeof j.voice === 'string' ? j.voice : undefined, rate: typeof j.rate === 'number' ? Math.min(2, Math.max(0.6, j.rate)) : 1, auto: j.auto === true }
  } catch {
    /* fall through */
  }
  return { rate: 1, auto: false }
}

export function saveReadAloud(s: ReadAloudSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* settings stay for this tab */
  }
}

export const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

/** The browser's voices, split into on-device ones (used) and cloud ones (never used). */
export function useVoices(): { local: SpeechSynthesisVoice[]; cloud: SpeechSynthesisVoice[]; ready: boolean } {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => (supported() ? speechSynthesis.getVoices() : []))
  const [ready, setReady] = useState(voices.length > 0)
  useEffect(() => {
    if (!supported()) {
      setReady(true)
      return
    }
    const update = () => {
      setVoices(speechSynthesis.getVoices())
      setReady(true)
    }
    speechSynthesis.addEventListener('voiceschanged', update)
    update()
    // some browsers only fill the list after a moment and never fire the event
    const t = setTimeout(update, 1500)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', update)
      clearTimeout(t)
    }
  }, [])
  return { local: voices.filter((v) => v.localService), cloud: voices.filter((v) => !v.localService), ready }
}

/** The voice to use: the chosen one if it is still on this device, else one in the page's language. */
export function pickVoice(local: SpeechSynthesisVoice[], wanted?: string): SpeechSynthesisVoice | null {
  if (!local.length) return null
  const chosen = local.find((v) => v.voiceURI === wanted)
  if (chosen) return chosen
  const lang = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return local.find((v) => v.lang.toLowerCase().startsWith(lang) && v.default) ?? local.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? local.find((v) => v.default) ?? local[0]
}

/** Markdown to something worth hearing: no symbols, no code, links as their words. */
export function speakable(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' (code block) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*(\d+)\.\s+/gm, '$1. ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(/\|/g, ' ')
    .replace(/https?:\/\/\S+/g, 'a link')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Splits text into sentence-sized pieces (some engines stop long utterances halfway). */
function pieces(text: string): { text: string; at: number }[] {
  const out: { text: string; at: number }[] = []
  const re = /[^.!?\n]+[.!?]*[\s\n]*/g
  let buf = ''
  let bufAt = 0
  for (const m of text.matchAll(re)) {
    if (!buf) bufAt = m.index
    buf += m[0]
    if (buf.length > 160) {
      out.push({ text: buf, at: bufAt })
      buf = ''
    }
  }
  if (buf.trim()) out.push({ text: buf, at: bufAt })
  return out
}

export interface Reading {
  stop: () => void
}

/**
 * Reads `text` with an on-device voice. `onProgress` gets 0..1 as words are spoken.
 * Refuses any voice that isn't local.
 */
export function speak(text: string, voice: SpeechSynthesisVoice, rate: number, hooks: { onProgress?: (p: number) => void; onEnd?: () => void }): Reading {
  if (!voice.localService) throw new Error('Only on-device voices are used.')
  speechSynthesis.cancel()
  const parts = pieces(text)
  const total = Math.max(1, text.length)
  let stopped = false
  let i = 0
  const next = () => {
    if (stopped) return
    if (i >= parts.length) {
      hooks.onProgress?.(1)
      hooks.onEnd?.()
      return
    }
    const part = parts[i++]
    const u = new SpeechSynthesisUtterance(part.text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = rate
    u.onboundary = (e) => hooks.onProgress?.(Math.min(1, (part.at + e.charIndex) / total))
    u.onend = next
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return
      next()
    }
    speechSynthesis.speak(u)
  }
  next()
  return {
    stop: () => {
      stopped = true
      speechSynthesis.cancel()
      hooks.onEnd?.()
    },
  }
}

import { useSyncExternalStore } from 'react'

/**
 * Read-aloud controller (browser speech synthesis). A single shared controller guarantees only one
 * utterance plays at a time. Speech is only ever started by a user action - never automatically -
 * so it does not compete with screen readers.
 */
export type SpeechState = 'idle' | 'speaking' | 'paused'

interface Snapshot {
  state: SpeechState
  text: string
  id: string | null
}

const BCP47: Record<string, string> = { en: 'en', am: 'am', om: 'om', so: 'so', ti: 'ti' }

let snapshot: Snapshot = { state: 'idle', text: '', id: null }
const listeners = new Set<() => void>()
const emit = (next: Snapshot) => {
  snapshot = next
  listeners.forEach((l) => l())
}

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function voiceFor(locale: string): SpeechSynthesisVoice | undefined {
  if (!speechSupported()) return undefined
  const prefix = BCP47[locale] ?? locale
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix))
}

export function hasVoiceFor(locale: string) {
  return voiceFor(locale) !== undefined
}

export const speech = {
  speak(id: string, text: string, locale: string) {
    if (!speechSupported()) return false
    const voice = voiceFor(locale)
    if (!voice) return false
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = 0.95
    u.onend = () => snapshot.id === id && emit({ state: 'idle', text: '', id: null })
    u.onerror = () => snapshot.id === id && emit({ state: 'idle', text: '', id: null })
    emit({ state: 'speaking', text, id })
    window.speechSynthesis.speak(u)
    return true
  },
  pause() {
    if (snapshot.state !== 'speaking') return
    window.speechSynthesis.pause()
    emit({ ...snapshot, state: 'paused' })
  },
  resume() {
    if (snapshot.state !== 'paused') return
    window.speechSynthesis.resume()
    emit({ ...snapshot, state: 'speaking' })
  },
  stop() {
    if (speechSupported()) window.speechSynthesis.cancel()
    emit({ state: 'idle', text: '', id: null })
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  // Voices load asynchronously in some browsers; re-render when they arrive.
  if (speechSupported()) window.speechSynthesis.addEventListener?.('voiceschanged', l)
  return () => {
    listeners.delete(l)
    if (speechSupported()) window.speechSynthesis.removeEventListener?.('voiceschanged', l)
  }
}

export function useSpeech(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  )
}

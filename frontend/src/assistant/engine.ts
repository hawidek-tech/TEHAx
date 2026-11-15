/**
 * Turn-taking for the voice assistant: speak → listen → understand → speak.
 *
 * - The assistant speaks with the device's voice for the current language. If there is no voice, the text is still
 *   shown (captions) and the conversation continues by text.
 * - It listens for ONE answer at a time (never continuous recording). The microphone is released as soon as an answer
 *   is heard, on pause, on leaving the page, and when the conversation ends. Nothing is recorded or stored.
 * - People can interrupt (Enter or Space, or a tap on "Talk"), type instead of speaking, or tap a suggestion.
 * - Silence and recognition errors are handled politely; after two silences the assistant pauses and waits.
 */
import { voiceFor } from '../a11y/speech'
import { control, type Control } from './nlu'

export type Status = 'idle' | 'speaking' | 'listening' | 'waiting' | 'paused' | 'thinking'
export interface Message {
  id: number
  from: 'assistant' | 'user'
  text: string
}
export interface AskOptions {
  /** Suggested answers shown as buttons (and read out as choices). */
  chips?: string[]
  /** Spoken when the person asks for help on this question. */
  help?: string
  /** 'password': typed only, never spoken or shown. */
  kind?: 'text' | 'password'
  /** Allow "skip" (optional questions). */
  optional?: boolean
}
export type Answer = { text: string } | { control: Control }

export class MenuSignal extends Error {}
export class EndSignal extends Error {}

export interface EngineIO {
  locale: () => string
  t: (key: string, options?: Record<string, unknown>) => string
  voiceOutput: () => boolean
  onMessage: (m: Message) => void
  onStatus: (s: Status) => void
  onChips: (chips: string[]) => void
  onInputKind: (kind: 'text' | 'password') => void
}

interface RecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult:
    | ((e: {
        resultIndex: number
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
      }) => void)
    | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => RecognitionLike

export const RECOGNITION_LANG: Record<string, string> = {
  en: 'en-US',
  am: 'am-ET',
  om: 'om-ET',
  so: 'so-SO',
  ti: 'ti-ET',
}

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}
export const canListen = () => typeof window !== 'undefined' && recognitionCtor() !== undefined

export class ConversationEngine {
  private nextId = 1
  private speakingDone: (() => void) | null = null
  private recognition: RecognitionLike | null = null
  private pendingInput:
    ((a: { text: string } | { error: string } | { interrupt: true }) => void) | null = null
  private resumeWaiter: (() => void) | null = null
  private ended = false
  /** Microphone input; turned off when recognition is unavailable, refused, or the person chose to type. */
  listening = canListen()

  private io: EngineIO

  constructor(io: EngineIO) {
    this.io = io
  }

  // ---- Output -------------------------------------------------------------------------------------------------
  private post(from: Message['from'], text: string) {
    this.io.onMessage({ id: this.nextId++, from, text })
  }

  /** Says (and shows) a message; resolves when finished, interrupted, or immediately without a voice. */
  say(text: string): Promise<void> {
    this.post('assistant', text)
    return this.speak(text)
  }

  private speak(text: string): Promise<void> {
    const voice = this.io.voiceOutput() ? voiceFor(this.io.locale()) : undefined
    if (!voice || !('speechSynthesis' in window)) return Promise.resolve()
    return new Promise((resolve) => {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      u.rate = 0.95
      const done = () => {
        if (this.speakingDone === done) this.speakingDone = null
        resolve()
      }
      this.speakingDone = done
      u.onend = done
      u.onerror = done
      this.io.onStatus('speaking')
      window.speechSynthesis.speak(u)
      // Safety net: some engines never fire onend.
      window.setTimeout(done, Math.min(60_000, 2_000 + text.length * 90))
    })
  }

  // ---- Input --------------------------------------------------------------------------------------------------
  /** Asks one question and returns the answer. Repeat / help / stop / menu are handled here. */
  async ask(prompt: string, opts: AskOptions = {}): Promise<Answer> {
    const kind = opts.kind ?? 'text'
    await this.say(prompt)
    let silences = 0
    for (;;) {
      if (this.ended) throw new EndSignal()
      this.io.onChips(opts.chips ?? [])
      this.io.onInputKind(kind)
      const got = await this.input(kind === 'text' && this.listening)
      this.io.onChips([])
      if (this.ended) throw new EndSignal()
      if ('interrupt' in got) continue // "Talk" pressed while waiting: listen again
      if ('error' in got) {
        if (got.error === 'no-speech' || got.error === 'aborted') {
          silences++
          if (silences >= 2) {
            await this.pause(this.io.t('assistant.pausedSilence'))
            silences = 0
            await this.say(prompt)
          } else await this.say(this.io.t('assistant.silence'))
          continue
        }
        // Microphone refused / no speech service / language not supported: continue by typing.
        this.listening = false
        await this.say(
          this.io.t(`assistant.micError.${got.error}`, { defaultValue: '' }) ||
            this.io.t('assistant.micError.other'),
        )
        continue
      }
      const text = got.text.trim()
      if (!text) continue
      if (kind === 'password') this.io.onInputKind('text')
      if (kind !== 'password') this.post('user', text)
      const c = kind === 'password' ? null : control(text)
      if (c === 'repeat') {
        await this.say(prompt)
        continue
      }
      if (c === 'help') {
        await this.say(opts.help ?? this.io.t('assistant.generalHelp'))
        await this.say(prompt)
        continue
      }
      if (c === 'stop') {
        await this.pause(this.io.t('assistant.paused'))
        await this.say(prompt)
        continue
      }
      if (c === 'menu') throw new MenuSignal()
      if (c === 'skip' && !opts.optional) {
        await this.say(this.io.t('assistant.cannotSkip'))
        await this.say(prompt)
        continue
      }
      if (c === 'back' || c === 'skip') return { control: c }
      return { text }
    }
  }

  /** Waits for typed text, a suggestion, or (when listening) one spoken answer. */
  private input(
    listen: boolean,
  ): Promise<{ text: string } | { error: string } | { interrupt: true }> {
    return new Promise((resolve) => {
      this.pendingInput = (a) => {
        this.pendingInput = null
        this.stopRecognition()
        resolve(a)
      }
      if (listen) this.startRecognition()
      else this.io.onStatus('waiting')
    })
  }

  private startRecognition() {
    const C = recognitionCtor()
    if (!C) {
      this.listening = false
      this.io.onStatus('waiting')
      return
    }
    const r = new C()
    r.lang = RECOGNITION_LANG[this.io.locale()] ?? this.io.locale()
    r.interimResults = false
    r.continuous = false
    r.maxAlternatives = 1
    let heard = ''
    let error = ''
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) heard += e.results[i][0].transcript
    }
    r.onerror = (e) => {
      error = e.error
    }
    r.onend = () => {
      if (this.recognition !== r) return
      this.recognition = null
      const deliver = this.pendingInput
      if (!deliver) return
      if (heard.trim()) deliver({ text: heard })
      else
        deliver({
          error:
            error === 'not-allowed' || error === 'service-not-allowed'
              ? 'permission'
              : error === 'language-not-supported'
                ? 'language'
                : error === 'network'
                  ? 'network'
                  : error === 'audio-capture'
                    ? 'noMicrophone'
                    : 'no-speech',
        })
    }
    this.recognition = r
    this.io.onStatus('listening')
    try {
      r.start()
    } catch {
      this.recognition = null
      this.pendingInput?.({ error: 'other' })
    }
  }

  private stopRecognition() {
    const r = this.recognition
    this.recognition = null
    try {
      r?.abort() // releases the microphone
    } catch {
      /* already stopped */
    }
  }

  /** Typed text or a tapped suggestion. */
  submit(text: string) {
    if (this.resumeWaiter) this.resume()
    this.pendingInput?.({ text })
  }

  /** Enter / Space / "Talk": stop speaking and listen now; or resume after a pause; or listen again. */
  interrupt() {
    if (this.resumeWaiter) return this.resume()
    if (this.speakingDone) {
      window.speechSynthesis?.cancel()
      this.speakingDone()
      return
    }
    if (this.pendingInput && !this.recognition && this.listening)
      this.pendingInput({ interrupt: true })
  }

  /** Stop speaking and listening; wait until the person presses Enter / Talk, or types. */
  async pause(message: string) {
    this.stopRecognition()
    window.speechSynthesis?.cancel()
    this.speakingDone?.()
    this.post('assistant', message)
    await this.speak(message)
    this.io.onStatus('paused')
    await new Promise<void>((resolve) => (this.resumeWaiter = resolve))
  }

  resume() {
    const r = this.resumeWaiter
    this.resumeWaiter = null
    r?.()
  }

  get paused() {
    return this.resumeWaiter !== null
  }

  /** Ends the conversation: silence, microphone off. */
  end() {
    this.ended = true
    this.stopRecognition()
    window.speechSynthesis?.cancel()
    this.speakingDone?.()
    this.resumeWaiter?.()
    this.pendingInput?.({ error: 'aborted' })
    this.io.onStatus('idle')
  }

  showUser(text: string) {
    this.post('user', text)
  }

  thinking() {
    this.io.onStatus('thinking')
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimal typing for the Web Speech API recognition interface (not in TypeScript's DOM lib). */
interface RecognitionResultEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const recognitionSupported = () => typeof window !== 'undefined' && ctor() !== undefined

/** Language tags passed to the recogniser. Support for om/so/ti varies by browser - see known limitations. */
const RECOGNITION_LANG: Record<string, string> = {
  en: 'en-US',
  am: 'am-ET',
  om: 'om-ET',
  so: 'so-SO',
  ti: 'ti-ET',
}

export type VoiceError =
  'permissionDenied' | 'noSpeech' | 'network' | 'languageUnsupported' | 'noMicrophone' | 'error'

const ERROR_MAP: Record<string, VoiceError> = {
  'not-allowed': 'permissionDenied',
  'service-not-allowed': 'permissionDenied',
  'no-speech': 'noSpeech',
  network: 'network',
  'language-not-supported': 'languageUnsupported',
  'audio-capture': 'noMicrophone',
}

/**
 * Speech-to-text. The microphone is requested only when start() is called (user pressed the button).
 * The transcript is NEVER applied automatically - callers must show it for review first.
 */
export function useSpeechRecognition(locale: string) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<VoiceError | null>(null)
  const rec = useRef<Recognition | null>(null)

  useEffect(() => () => rec.current?.abort(), [])

  const start = useCallback(() => {
    const C = ctor()
    if (!C) {
      setError('error')
      return
    }
    rec.current?.abort()
    const r = new C()
    r.lang = RECOGNITION_LANG[locale] ?? locale
    r.interimResults = true
    r.continuous = false
    r.maxAlternatives = 1
    let finalText = ''
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interim += res[0].transcript
      }
      setTranscript((finalText + interim).trim())
    }
    r.onerror = (e) => setError(ERROR_MAP[e.error] ?? 'error')
    r.onend = () => setListening(false)
    setTranscript('')
    setError(null)
    setListening(true)
    rec.current = r
    try {
      r.start()
    } catch {
      setListening(false)
      setError('error')
    }
  }, [locale])

  const stop = useCallback(() => rec.current?.stop(), [])

  return { listening, transcript, error, start, stop, setTranscript }
}

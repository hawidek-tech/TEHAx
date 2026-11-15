import { HelpCircle, Pause, Play, Power, Repeat, Square, Volume2 } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useT } from '../i18n/useT'
import { usePreferences } from './preferences'
import { hasVoiceFor, speech, speechSupported, useSpeech } from './speech'

/**
 * Audio guidance for blind and low-vision users ("Activate Audio Accessibility").
 * - Starts ONLY from an explicit user action (browsers block audio without one; it also never surprises screen-reader users).
 * - Speaks page titles/announcements, each question with progress, choices and how to answer, errors and success.
 * - Complements semantic HTML and screen readers; every spoken text is also shown on screen in the guide bar.
 * - Uses the device's speech voices. If there is no voice for the selected language it says so on screen rather than
 *   reading Amharic (or any language) with a wrong-language voice.
 */
interface AudioGuide {
  active: boolean
  activate: () => void
  deactivate: () => void
  /** Speak (and show) a message. Replaces whatever is being said. */
  say: (text: string) => void
}

const GUIDE_ID = 'audio-guide'
const Ctx = createContext<AudioGuide>({
  active: false,
  activate: () => undefined,
  deactivate: () => undefined,
  say: () => undefined,
})

export function AudioGuideProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const { prefs, update } = usePreferences()
  const [lastText, setLastText] = useState('')
  const [needsGesture, setNeedsGesture] = useState(false)
  const active = prefs.audioGuide
  const locale = prefs.locale

  const speakNow = useCallback(
    (text: string) => {
      setLastText(text)
      if (!speechSupported() || !hasVoiceFor(locale)) return
      // Browsers only allow speech after the user has interacted with the page.
      const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
        .userActivation
      if (activation && !activation.hasBeenActive) {
        setNeedsGesture(true)
        return
      }
      setNeedsGesture(false)
      speech.speak(GUIDE_ID, text, locale)
    },
    [locale],
  )

  const say = useCallback(
    (text: string) => active && text.trim() && speakNow(text.trim()),
    [active, speakNow],
  )

  const activate = useCallback(() => {
    update({ audioGuide: true, readAloud: true })
    const main = document.querySelector('[data-page-heading]')?.textContent ?? ''
    speakNow(`${t('audio.activated')} ${main}. ${t('audio.pageHelp')}`)
  }, [update, speakNow, t])

  const deactivate = useCallback(() => {
    speech.stop()
    update({ audioGuide: false })
  }, [update])

  const value = useMemo(
    () => ({ active, activate, deactivate, say }),
    [active, activate, deactivate, say],
  )
  return (
    <Ctx.Provider value={value}>
      {children}
      {active && (
        <AudioGuideBar
          text={lastText}
          needsGesture={needsGesture}
          onReplay={() => speakNow(lastText)}
          onHelp={() => speakNow(t('audio.navigationHelp'))}
          onOff={deactivate}
        />
      )}
    </Ctx.Provider>
  )
}

export const useAudioGuide = () => useContext(Ctx)

function AudioGuideBar({
  text,
  needsGesture,
  onReplay,
  onHelp,
  onOff,
}: {
  text: string
  needsGesture: boolean
  onReplay: () => void
  onHelp: () => void
  onOff: () => void
}) {
  const t = useT()
  const { prefs } = usePreferences()
  const s = useSpeech()
  const mine = s.id === GUIDE_ID
  const voice = speechSupported() && hasVoiceFor(prefs.locale)
  const btn =
    'af-transition inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-bg px-3 text-sm font-semibold'
  return (
    <section
      aria-label={t('audio.barLabel')}
      className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-primary bg-ink text-bg no-print"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
        <p className="flex items-start gap-2 text-base">
          <Volume2 aria-hidden="true" className="mt-1 shrink-0" />
          <span>
            <span className="font-bold">{t('audio.barTitle')}: </span>
            {!speechSupported()
              ? t('audio.noSpeech')
              : !voice
                ? t('audio.noVoice')
                : needsGesture
                  ? t('audio.needsGesture')
                  : mine && s.state !== 'idle'
                    ? t('audio.speaking')
                    : t('audio.ready')}
          </span>
        </p>
        {text && (
          <p
            className="max-h-24 overflow-y-auto rounded-lg bg-bg/10 px-3 py-2 text-base"
            data-testid="audio-guide-text"
          >
            {text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={onReplay}>
            <Repeat size={16} aria-hidden="true" />
            {needsGesture ? t('audio.continue') : t('audio.repeat')}
          </button>
          {mine && s.state === 'speaking' && (
            <button type="button" className={btn} onClick={() => speech.pause()}>
              <Pause size={16} aria-hidden="true" />
              {t('readAloud.pause')}
            </button>
          )}
          {mine && s.state === 'paused' && (
            <button type="button" className={btn} onClick={() => speech.resume()}>
              <Play size={16} aria-hidden="true" />
              {t('readAloud.resume')}
            </button>
          )}
          {mine && s.state !== 'idle' && (
            <button type="button" className={btn} onClick={() => speech.stop()}>
              <Square size={14} aria-hidden="true" />
              {t('readAloud.stop')}
            </button>
          )}
          <button type="button" className={btn} onClick={onHelp}>
            <HelpCircle size={16} aria-hidden="true" />
            {t('audio.help')}
          </button>
          <button type="button" className={btn} onClick={onOff}>
            <Power size={16} aria-hidden="true" />
            {t('audio.turnOff')}
          </button>
        </div>
      </div>
    </section>
  )
}

/** Reads the current page when the route changes (pages with a form flow are read by the form engine instead). */
export function useRouteAudio(pathname: string) {
  const { active, say } = useAudioGuide()
  const t = useT()
  const last = useRef('')
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => {
      if (document.querySelector('[data-flow]')) return
      const parts = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-page-heading], [data-page-lead], [data-announce]',
        ),
      )
        .map((el) => el.innerText.trim())
        .filter(Boolean)
      const text = `${parts.join('. ')}. ${t('audio.pageHelp')}`
      if (text !== last.current) {
        last.current = text
        say(text)
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [pathname, active, say, t])
}

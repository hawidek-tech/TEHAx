import { Pause, Play, Square, Volume2 } from 'lucide-react'
import { useId } from 'react'
import { useT } from '../i18n/useT'
import { usePreferences } from './preferences'
import { hasVoiceFor, speech, speechSupported, useSpeech } from './speech'

/**
 * Visible Listen / Pause / Resume / Stop controls for a piece of text. Audio is never the only way to get
 * information - the text is always on screen. Shown when the read-aloud preference is on.
 */
export function ReadAloud({ text, label }: { text: string; label?: string }) {
  const t = useT()
  const { prefs } = usePreferences()
  const id = useId()
  const s = useSpeech()
  if (!prefs.readAloud) return null

  if (!speechSupported()) {
    return <p className="text-sm text-muted">{t('readAloud.unsupported')}</p>
  }
  if (!hasVoiceFor(prefs.locale)) {
    return <p className="text-sm text-muted">{t('readAloud.noVoice')}</p>
  }

  const mine = s.id === id
  const btn =
    'af-transition inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-soft'
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={label ?? t('readAloud.group')}
    >
      {!mine || s.state === 'idle' ? (
        <button type="button" className={btn} onClick={() => speech.speak(id, text, prefs.locale)}>
          <Volume2 aria-hidden="true" size={18} />
          {t('readAloud.listen')}
        </button>
      ) : (
        <>
          {s.state === 'speaking' ? (
            <button type="button" className={btn} onClick={() => speech.pause()}>
              <Pause aria-hidden="true" size={18} />
              {t('readAloud.pause')}
            </button>
          ) : (
            <button type="button" className={btn} onClick={() => speech.resume()}>
              <Play aria-hidden="true" size={18} />
              {t('readAloud.resume')}
            </button>
          )}
          <button type="button" className={btn} onClick={() => speech.stop()}>
            <Square aria-hidden="true" size={16} />
            {t('readAloud.stop')}
          </button>
        </>
      )}
    </div>
  )
}

/** Caption bar: shows on screen exactly what is being read aloud (captions/text alternative preference). */
export function CaptionBar() {
  const t = useT()
  const { prefs } = usePreferences()
  const s = useSpeech()
  if (!prefs.captions || s.state === 'idle') return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-ink px-4 py-3 text-bg no-print">
      <p className="mx-auto max-w-3xl text-base">
        <span className="mr-2 font-bold">{t('readAloud.captionLabel')}</span>
        {s.text}
      </p>
    </div>
  )
}

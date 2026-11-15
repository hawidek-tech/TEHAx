import { Mic, MicOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { useT } from '../i18n/useT'
import { storage } from '../lib/storage'
import { useAnnounce } from './announcer'
import { useAudioGuide } from './audioGuide'
import { usePreferences } from './preferences'
import { speech } from './speech'
import { recognitionSupported, useSpeechRecognition } from './voice'
import { emitVoiceCommand, interpret } from './voiceCommands'

interface Props {
  /** Choices that can be picked by saying their number or name. Empty: commands only. */
  options?: { value: string; label: string }[]
  onOption?: (value: string, label: string) => void
  onYes?: () => void
  onNo?: () => void
  /** Visible button text (defaults to "Answer by voice"). */
  label?: string
  /** Larger, primary-coloured button (voice-guided mode). */
  prominent?: boolean
  /** Visually smaller (inside the audio bar). */
  compact?: boolean
  className?: string
}

/**
 * One press = listen once (voice-guided mode). The person says a number, the name of a choice, yes/no, or a command
 * (next, back, repeat, help, stop). What was heard is always shown on screen, and a choice is only SELECTED - the
 * person still checks it and presses (or says) Next. Typing, tapping and keyboard always work without a microphone.
 */
export function VoiceAnswer({
  options = [],
  onOption,
  onYes,
  onNo,
  label,
  prominent,
  compact,
  className = '',
}: Props) {
  const t = useT()
  const announce = useAnnounce()
  const guide = useAudioGuide()
  const { prefs } = usePreferences()
  const { listening, transcript, error, start, stop } = useSpeechRecognition(prefs.locale)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const handledFor = useRef<string | null>(null)
  const waiting = useRef(false)

  // When listening ends, act once on what was heard.
  useEffect(() => {
    if (listening || !waiting.current) return
    waiting.current = false
    if (error) {
      const msg = t('voice.errors.' + error)
      setFeedback(msg)
      announce(msg, 'assertive')
      guide.say(msg)
      return
    }
    const heard = transcript.trim()
    if (!heard || handledFor.current === heard) return
    handledFor.current = heard
    const result = interpret(heard, options)
    let msg: string
    if (result.kind === 'option' && onOption) {
      onOption(result.value, result.label)
      msg = t('voiceAnswer.chose', { option: result.label })
    } else if (result.kind === 'yes' && onYes) {
      onYes()
      msg = t('voiceAnswer.yes')
    } else if (result.kind === 'no' && onNo) {
      onNo()
      msg = t('voiceAnswer.no')
    } else if (result.kind === 'command') {
      const handled = emitVoiceCommand(result.command)
      if (handled) msg = t(`voiceAnswer.did.${result.command}`)
      else if (result.command === 'repeat') {
        guide.repeat()
        msg = ''
      } else if (result.command === 'help') msg = t('audio.navigationHelp')
      else if (result.command === 'stop') {
        speech.stop()
        msg = ''
      } else if (result.command === 'back') {
        window.history.back()
        msg = t('voiceAnswer.did.back')
      } else msg = t('voiceAnswer.notHere')
    } else msg = t('voiceAnswer.notUnderstood', { heard })
    setFeedback(`${t('voiceAnswer.heard', { heard })} ${msg}`.trim())
    if (msg) {
      announce(msg)
      guide.say(msg)
    }
    // The handlers above run from an effect reacting to the recogniser (an external system).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening])

  if (!recognitionSupported()) return null

  const begin = () => {
    if (!storage.get('voicePrivacyAccepted', false)) {
      setPrivacyOpen(true)
      return
    }
    listen()
  }
  const listen = () => {
    speech.stop() // never listen while ACCESSFLOW is talking
    handledFor.current = null
    waiting.current = true
    setFeedback('')
    start()
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Button
        variant={prominent ? 'primary' : 'secondary'}
        size={compact ? 'sm' : prominent ? 'md' : 'sm'}
        icon={
          listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />
        }
        onClick={listening ? stop : begin}
      >
        {listening ? t('voice.stopListening') : (label ?? t('voiceAnswer.button'))}
      </Button>
      <p className={`text-sm ${compact ? '' : 'font-semibold'}`} aria-live="polite">
        {listening
          ? t(options.length ? 'voiceAnswer.listening' : 'voiceAnswer.listeningCommand')
          : feedback}
      </p>
      <Dialog
        open={privacyOpen}
        title={t('voice.privacyTitle')}
        onClose={() => setPrivacyOpen(false)}
        actions={
          <>
            <Button
              onClick={() => {
                storage.set('voicePrivacyAccepted', true)
                setPrivacyOpen(false)
                listen()
              }}
            >
              {t('voice.privacyAccept')}
            </Button>
            <Button variant="ghost" onClick={() => setPrivacyOpen(false)}>
              {t('voice.privacyDecline')}
            </Button>
          </>
        }
      >
        <p>{t('voice.privacyBody')}</p>
      </Dialog>
    </div>
  )
}

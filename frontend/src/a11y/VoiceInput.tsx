import { Mic, MicOff } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { useT } from '../i18n/useT'
import { storage } from '../lib/storage'
import { useAnnounce } from './announcer'
import { usePreferences } from './preferences'
import { recognitionSupported, useSpeechRecognition } from './voice'

interface Props {
  /** Visible question text, used to label the dialog. */
  question: string
  currentValue: string
  multiline?: boolean
  onAccept: (text: string) => void
}

/**
 * Voice input for one field: 1) privacy notice on first use, 2) speak, 3) see and edit the recognised text,
 * 4) confirm. Unreviewed speech is never written into the answer. Typing always remains available.
 */
export function VoiceInput({ question, currentValue, multiline, onAccept }: Props) {
  const t = useT()
  const announce = useAnnounce()
  const { prefs } = usePreferences()
  const { listening, transcript, error, start, stop, setTranscript } = useSpeechRecognition(
    prefs.locale,
  )
  const [open, setOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const editId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!listening && open && transcript) announce(t('voice.recognised'))
  }, [listening, open, transcript, announce, t])

  useEffect(() => {
    if (error) announce(t('voice.errors.' + error), 'assertive')
  }, [error, announce, t])

  if (!recognitionSupported()) {
    return <p className="text-sm text-muted">{t('voice.unsupported')}</p>
  }

  const begin = () => {
    if (!storage.get('voicePrivacyAccepted', false)) {
      setPrivacyOpen(true)
      return
    }
    setOpen(true)
    start()
  }

  const close = () => {
    stop()
    setOpen(false)
    triggerRef.current?.focus()
  }

  const accept = () => {
    const text = transcript.trim()
    if (!text) return
    onAccept(mode === 'append' && currentValue ? `${currentValue} ${text}` : text)
    announce(t('voice.applied'))
    close()
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="secondary"
        size="sm"
        icon={<Mic size={18} aria-hidden="true" />}
        onClick={begin}
      >
        {t('voice.button')}
      </Button>

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
                setOpen(true)
                start()
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

      <Dialog
        open={open}
        title={t('voice.reviewTitle')}
        onClose={close}
        actions={
          <>
            <Button onClick={accept} disabled={!transcript.trim() || listening}>
              {t('voice.useText')}
            </Button>
            {listening ? (
              <Button
                variant="secondary"
                icon={<MicOff size={18} aria-hidden="true" />}
                onClick={stop}
              >
                {t('voice.stopListening')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon={<Mic size={18} aria-hidden="true" />}
                onClick={start}
              >
                {t('voice.tryAgain')}
              </Button>
            )}
            <Button variant="ghost" onClick={close}>
              {t('voice.discard')}
            </Button>
          </>
        }
      >
        <p className="mb-2 text-muted">{question}</p>
        <p className="mb-3 font-semibold" aria-live="polite">
          {listening
            ? t('voice.listening')
            : error
              ? t('voice.errors.' + error)
              : t('voice.reviewLead')}
        </p>
        <label htmlFor={editId} className="mb-1 block font-semibold">
          {t('voice.editLabel')}
        </label>
        {multiline ? (
          <textarea
            id={editId}
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full rounded-lg border-2 border-field bg-surface p-3 text-lg text-ink"
          />
        ) : (
          <input
            id={editId}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="min-h-12 w-full rounded-lg border-2 border-field bg-surface px-3 text-lg text-ink"
          />
        )}
        {currentValue && (
          <fieldset className="mt-3">
            <legend className="font-semibold">{t('voice.modeLegend')}</legend>
            <label className="mt-1 flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={editId + 'mode'}
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="size-5"
              />
              {t('voice.modeReplace')}
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={editId + 'mode'}
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="size-5"
              />
              {t('voice.modeAppend')}
            </label>
          </fieldset>
        )}
      </Dialog>
    </>
  )
}

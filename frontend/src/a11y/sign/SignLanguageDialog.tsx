import {
  Camera,
  CameraOff,
  Hand,
  HandHelping,
  Mail,
  MessageSquare,
  Phone,
  ThumbsDown,
  ThumbsUp,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Dialog } from '../../design-system/Dialog'
import { inputClass } from '../../design-system/Field'
import { useT } from '../../i18n/useT'
import { useAnnounce } from '../announcer'
import { availableRecognizer } from './recognition'

const PHRASES = [
  { key: 'yes', icon: ThumbsUp },
  { key: 'no', icon: ThumbsDown },
  { key: 'needHelp', icon: HandHelping },
  { key: 'useSignLanguage', icon: Hand },
  { key: 'interpreter', icon: Video },
  { key: 'contactSms', icon: MessageSquare },
  { key: 'contactEmail', icon: Mail },
  { key: 'noCall', icon: Phone },
] as const

/**
 * Communicate without speaking or typing: optional camera for sign recognition (when a validated recogniser exists),
 * a pictogram phrase board, and an editable message that must be confirmed before it is used.
 */
export function SignLanguageDialog({
  open,
  question,
  currentValue,
  onClose,
  onAccept,
}: {
  open: boolean
  question: string
  currentValue: string
  onClose: () => void
  onAccept: (text: string) => void
}) {
  const t = useT()
  const announce = useAnnounce()
  const id = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [message, setMessage] = useState(currentValue)
  const recognizer = availableRecognizer()

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    recognizer?.stop()
    setCameraOn(false)
  }, [recognizer])

  // Always release the camera when the dialog closes (it unmounts), or the page is hidden or left.
  useEffect(() => {
    const hide = () => document.visibilityState === 'hidden' && stopCamera()
    window.addEventListener('pagehide', stopCamera)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('pagehide', stopCamera)
      document.removeEventListener('visibilitychange', hide)
      stopCamera()
    }
  }, [stopCamera])

  const startCamera = async () => {
    setCameraError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('sign.cameraUnsupported'))
      return
    }
    try {
      // Requested only now, after the user pressed the button. Video stays on the device; nothing is recorded.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setCameraOn(true)
      announce(t('sign.cameraOnAnnounce'))
      if (recognizer && videoRef.current) {
        await recognizer.start(videoRef.current, (r) =>
          setMessage((m) => (m ? `${m} ${r.text}` : r.text)),
        )
      }
    } catch {
      setCameraError(t('sign.cameraDenied'))
      announce(t('sign.cameraDenied'), 'assertive')
    }
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  return (
    <Dialog
      open={open}
      title={t('sign.title')}
      onClose={close}
      actions={
        <>
          <Button
            onClick={() => {
              const text = message.trim()
              if (text) {
                onAccept(text)
                close()
              }
            }}
            disabled={!message.trim()}
          >
            {t('sign.useMessage')}
          </Button>
          <Button variant="ghost" onClick={close}>
            {t('app.cancel')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted">{question}</p>

        <section
          aria-labelledby={`${id}-cam`}
          className="flex flex-col gap-2 rounded-xl border-2 border-line p-3"
        >
          <h3 id={`${id}-cam`} className="font-bold">
            {t('sign.cameraTitle')}
          </h3>
          <p className="text-sm">{t('sign.privacy')}</p>
          {recognizer ? null : <Alert tone="warning">{t('sign.noRecognizer')}</Alert>}
          {cameraOn && (
            <p role="status" className="flex items-center gap-2 font-bold text-danger">
              <span className="inline-block size-3 rounded-full bg-danger" aria-hidden="true" />
              {t('sign.cameraOnIndicator')}
            </p>
          )}
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label={t('sign.previewLabel')}
            className={`${cameraOn ? 'block' : 'hidden'} max-h-56 w-full -scale-x-100 rounded-lg bg-ink object-cover`}
          />
          {cameraError && <Alert tone="error">{cameraError}</Alert>}
          {cameraOn ? (
            <Button
              variant="danger"
              icon={<CameraOff size={18} aria-hidden="true" />}
              onClick={() => {
                stopCamera()
                announce(t('sign.cameraOffAnnounce'))
              }}
            >
              {t('sign.stopCamera')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              icon={<Camera size={18} aria-hidden="true" />}
              onClick={startCamera}
            >
              {t('sign.startCamera')}
            </Button>
          )}
        </section>

        <fieldset className="rounded-xl border-2 border-line p-3">
          <legend className="px-1 font-bold">{t('sign.phrasesTitle')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PHRASES.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const p = t(`sign.phrases.${key}`)
                  setMessage((m) => (m ? `${m} ${p}` : p))
                  announce(t('sign.added', { phrase: p }))
                }}
                className="af-transition flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-field bg-surface p-2 text-center text-sm font-semibold hover:border-primary"
              >
                <Icon aria-hidden="true" size={28} />
                <span>{t(`sign.phrases.${key}`)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-msg`} className="font-bold">
            {t('sign.messageLabel')}
          </label>
          <p id={`${id}-msg-hint`} className="text-sm text-muted">
            {t('sign.messageHint')}
          </p>
          <textarea
            id={`${id}-msg`}
            aria-describedby={`${id}-msg-hint`}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass(false)} py-3`}
          />
        </div>
      </div>
    </Dialog>
  )
}

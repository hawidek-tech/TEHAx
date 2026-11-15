import { Hand, Keyboard, Mic, MicOff, Pause, Play, Send, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAudioGuide } from '../a11y/audioGuide'
import { usePreferences } from '../a11y/preferences'
import { SignLanguageDialog } from '../a11y/sign/SignLanguageDialog'
import { useOptionalT, useT } from '../i18n/useT'
import { useSession } from '../lib/session'
import { storage } from '../lib/storage'
import type { Locale } from '../lib/types'
import { runAssistant, type DialogContext } from './dialogs'
import { ConversationEngine, EndSignal, canListen, type Message, type Status } from './engine'

/**
 * The voice assistant: the primary experience for blind users (docs/ux/voice-assistant.md).
 * One press of Enter (or one tap) starts it - browsers do not allow speech before a user action. After that the whole
 * journey is a conversation: it speaks, listens for one answer, understands it (rule-based), and continues.
 * The same conversation works by typing, suggestions and picture phrases, with every message shown as text.
 */
export default function AssistantPage() {
  const t = useT()
  const opt = useOptionalT()
  const [params] = useSearchParams()
  const { me, register, signIn } = useSession()
  const { prefs, update } = usePreferences()
  const guide = useAudioGuide()
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [chips, setChips] = useState<string[]>([])
  const [inputKind, setInputKind] = useState<'text' | 'password'>('text')
  const [typed, setTyped] = useState('')
  const [started, setStarted] = useState(false)
  const [voiceOut, setVoiceOut] = useState(prefs.usageMode !== 'sign')
  const [mic, setMic] = useState(canListen() && prefs.usageMode !== 'sign')
  const [phrasesOpen, setPhrasesOpen] = useState(false)
  const engine = useRef<ConversationEngine | null>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLOListElement>(null)
  const inputId = useId()

  // The long-running conversation always reads the latest language, texts and session.
  const live = useRef({ t, opt, me, prefs, voiceOut })
  useEffect(() => {
    live.current = { t, opt, me, prefs, voiceOut }
  })

  const start = useCallback(() => {
    if (engine.current) return
    if (guide.active) guide.deactivate() // the assistant replaces the screen-reading voice guide here
    storage.set('voicePrivacyAccepted', true) // the privacy notice is shown and spoken before the first question
    const e = new ConversationEngine({
      locale: () => live.current.prefs.locale,
      t: (k, o) => live.current.t(k, o),
      voiceOutput: () => live.current.voiceOut,
      onMessage: (m) => setMessages((ms) => [...ms, m]),
      onStatus: setStatus,
      onChips: setChips,
      onInputKind: setInputKind,
    })
    e.listening = mic
    engine.current = e
    setStarted(true)
    const ctx: DialogContext = {
      e,
      t: (k, o) => live.current.t(k, o),
      opt: (k) => live.current.opt(k),
      me: () => live.current.me,
      register,
      signIn,
      setLocale: (l: Locale) => update({ locale: l }),
    }
    void (async () => {
      try {
        if (mic) await e.say(live.current.t('assistant.privacy'))
        await runAssistant(ctx)
      } catch (err) {
        if (!(err instanceof EndSignal)) {
          await e.say(live.current.t('assistant.error')).catch(() => undefined)
          setStatus('paused')
        }
      }
    })()
  }, [guide, mic, register, signIn, update])

  // Started from the welcome screen (the click there is the user action browsers require), or focus the Start button.
  useEffect(() => {
    if (params.get('start') === '1') start()
    else startRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Leaving the page or hiding it ends listening: the microphone is never left on.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && engine.current && !engine.current.paused)
        void engine.current.pause(live.current.t('assistant.paused'))
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      engine.current?.end()
      engine.current = null
    }
  }, [])

  // Enter or Space (outside text fields and buttons) = talk / interrupt / continue; Escape = pause.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement
      if (el.closest('input, textarea, select, button, a, dialog')) return
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault()
        if (!engine.current) start()
        else engine.current.interrupt()
      } else if (ev.key === 'Escape' && engine.current && !engine.current.paused) {
        void engine.current.pause(live.current.t('assistant.paused'))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [start])

  // Typing: the field gets focus when a password is needed (never spoken) or when the microphone is off.
  useEffect(() => {
    if (inputKind === 'password' || (!mic && status === 'waiting')) inputRef.current?.focus()
  }, [inputKind, mic, status])

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [messages])

  const submit = (text: string) => {
    if (!text.trim() || !engine.current) return
    engine.current.submit(text)
    setTyped('')
  }

  const talkLabel = !started
    ? t('assistant.ui.start')
    : status === 'speaking'
      ? t('assistant.ui.interrupt')
      : status === 'paused'
        ? t('assistant.ui.resume')
        : status === 'listening'
          ? t('assistant.ui.listening')
          : t('assistant.ui.talk')

  return (
    <div data-flow="assistant" className="mx-auto flex max-w-3xl flex-col gap-5">
      <section className="af-hero flex flex-col gap-4 p-5 sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar status={status} />
          <div className="min-w-0">
            <h1 data-page-heading tabIndex={-1} className="text-3xl font-extrabold sm:text-4xl">
              {t('assistant.ui.title')}
            </h1>
            <p className="text-lg font-semibold text-primary" role="status">
              {t(`assistant.status.${status}`)}
            </p>
          </div>
        </div>
        {!started && (
          <p data-page-lead className="text-lg">
            {t('assistant.ui.intro')} {mic && t('assistant.privacy')}
          </p>
        )}
        <button
          ref={startRef}
          type="button"
          onClick={() => (engine.current ? engine.current.interrupt() : start())}
          className="af-lift flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-2xl font-extrabold text-on-primary hover:bg-primary-strong"
        >
          {status === 'listening' ? (
            <Mic aria-hidden="true" size={30} />
          ) : status === 'paused' ? (
            <Play aria-hidden="true" size={30} />
          ) : (
            <Mic aria-hidden="true" size={30} />
          )}
          {talkLabel}
        </button>
        <p className="text-center text-muted">{t('assistant.ui.keys')}</p>
      </section>

      {started && (
        <>
          <section
            aria-labelledby="conversation-title"
            className="af-card flex flex-col gap-3 p-4 sm:p-6"
          >
            <h2 id="conversation-title" className="sr-only">
              {t('assistant.ui.conversation')}
            </h2>
            <ol
              ref={logRef}
              role="log"
              // With spoken replies on, screen readers stay quiet here (no double speech); text-only: announced.
              aria-live={voiceOut ? 'off' : 'polite'}
              className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto"
            >
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`af-enter max-w-[85%] rounded-2xl px-4 py-3 text-lg ${
                    m.from === 'assistant'
                      ? 'self-start rounded-bl-sm bg-primary-soft'
                      : 'self-end rounded-br-sm bg-primary text-on-primary'
                  }`}
                >
                  <span className="sr-only">
                    {m.from === 'assistant' ? t('assistant.ui.said') : t('assistant.ui.youSaid')}
                    :{' '}
                  </span>
                  {m.text}
                </li>
              ))}
            </ol>

            {chips.length > 0 && (
              <div
                role="group"
                aria-label={t('assistant.ui.suggestions')}
                className="flex flex-wrap gap-2"
              >
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => submit(c)}
                    className="af-lift min-h-11 rounded-full border-2 border-primary bg-surface px-4 font-semibold text-primary"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(ev) => {
                ev.preventDefault()
                submit(typed)
              }}
            >
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor={inputId} className="font-semibold">
                  {inputKind === 'password'
                    ? t('assistant.ui.passwordLabel')
                    : t('assistant.ui.typeLabel')}
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type={inputKind === 'password' ? 'password' : 'text'}
                  autoComplete={inputKind === 'password' ? 'current-password' : 'off'}
                  value={typed}
                  onChange={(ev) => setTyped(ev.target.value)}
                  className="min-h-12 w-full rounded-xl border-2 border-field bg-surface px-3 text-lg text-ink"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-on-primary hover:bg-primary-strong"
              >
                <Send aria-hidden="true" size={18} />
                {t('assistant.ui.send')}
              </button>
            </form>
          </section>

          <section aria-label={t('assistant.ui.options')} className="flex flex-wrap gap-2">
            <ToggleButton
              on={voiceOut}
              onToggle={() => {
                if (voiceOut) window.speechSynthesis?.cancel()
                setVoiceOut(!voiceOut)
              }}
              onIcon={<Volume2 aria-hidden="true" size={18} />}
              offIcon={<VolumeX aria-hidden="true" size={18} />}
              label={t('assistant.ui.voiceReplies')}
            />
            {canListen() && (
              <ToggleButton
                on={mic}
                onToggle={() => {
                  const next = !mic
                  setMic(next)
                  if (engine.current) engine.current.listening = next
                  if (!next) engine.current?.submit('') // stop listening now
                }}
                onIcon={<Mic aria-hidden="true" size={18} />}
                offIcon={<MicOff aria-hidden="true" size={18} />}
                label={t('assistant.ui.microphone')}
              />
            )}
            <button
              type="button"
              onClick={() => setPhrasesOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-field bg-surface px-4 font-semibold"
            >
              <Hand aria-hidden="true" size={18} />
              {t('assistant.ui.phrases')}
            </button>
            {status !== 'paused' && (
              <button
                type="button"
                onClick={() => engine.current && void engine.current.pause(t('assistant.paused'))}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-field bg-surface px-4 font-semibold"
              >
                <Pause aria-hidden="true" size={18} />
                {t('assistant.ui.pause')}
              </button>
            )}
            {!mic && (
              <p className="flex items-center gap-2 text-muted">
                <Keyboard aria-hidden="true" size={18} />
                {t('assistant.ui.typing')}
              </p>
            )}
          </section>
          {phrasesOpen && (
            <SignLanguageDialog
              open
              question={messages.filter((m) => m.from === 'assistant').at(-1)?.text ?? ''}
              currentValue=""
              onClose={() => setPhrasesOpen(false)}
              onAccept={(text) => submit(text)}
            />
          )}
        </>
      )}
    </div>
  )
}

function ToggleButton({
  on,
  onToggle,
  onIcon,
  offIcon,
  label,
}: {
  on: boolean
  onToggle: () => void
  onIcon: React.ReactNode
  offIcon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 font-semibold ${on ? 'border-primary bg-primary-soft text-primary' : 'border-field bg-surface'}`}
    >
      {on ? onIcon : offIcon}
      {label}
    </button>
  )
}

/** The assistant's visual identity: a friendly face; rings pulse while listening (not with reduced motion). */
function Avatar({ status }: { status: Status }) {
  return (
    <span
      className="relative inline-flex size-20 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      {status === 'listening' && (
        <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-25 motion-reduce:animate-none" />
      )}
      <svg viewBox="0 0 80 80" className="relative size-20">
        <circle cx="40" cy="40" r="38" fill="var(--af-primary)" />
        <circle cx="29" cy="34" r="5" fill="var(--af-on-primary)" />
        <circle cx="51" cy="34" r="5" fill="var(--af-on-primary)" />
        {status === 'speaking' ? (
          <ellipse cx="40" cy="54" rx="10" ry="7" fill="var(--af-on-primary)" />
        ) : (
          <path
            d="M28 51 q12 10 24 0"
            fill="none"
            stroke="var(--af-on-primary)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </span>
  )
}

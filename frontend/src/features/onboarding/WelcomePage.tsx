import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ClipboardList,
  Compass,
  Contrast,
  Hand,
  HeartHandshake,
  SlidersHorizontal,
  Type,
  UserRound,
  Volume2,
  WholeWord,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAudioGuide } from '../../a11y/audioGuide'
import { usageModePatch, usePreferences } from '../../a11y/preferences'
import { VoiceAnswer } from '../../a11y/VoiceAnswer'
import { Loading } from '../../design-system/Layout'
import { LOCALES } from '../../i18n'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { ApplicationSummary, Draft, Locale, NotificationItem, Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { profileUnfinished } from './profileParts'

/**
 * Front door (docs/ux/first-visit-flow.md, voice-first redesign).
 * One question - "Welcome to ACCESSFLOW. What would you like to do today?" - with language, the voice guide and
 * accessibility options on the same screen. Nothing has to be disclosed and the microphone is never required.
 * Returning visit: one sentence and one main action (news, unfinished work), or the same choices.
 */
export default function WelcomePage() {
  const { me } = useSession()
  const t = useT()
  if (me === undefined) return <Loading label={t('app.loading')} />
  if (me?.roles.includes('EMPLOYER')) return <Navigate to="/employer" replace />
  if (me?.roles.includes('SUPPORT_STAFF')) return <Navigate to="/staff" replace />
  return me ? <ReturningVisit name={me.displayName} /> : <FirstVisit />
}

/** "Activate Audio Accessibility" in English and Amharic (Track 1 requirement), whatever the page language. */
const AUDIO_LABEL: { lang: Locale; text: string }[] = [
  { lang: 'en', text: 'Activate Audio Accessibility' },
  { lang: 'am', text: 'የድምፅ ተደራሽነትን አብራ' },
]

type Intent = { key: string; icon: ReactNode; to?: string }

function intents(signedIn: boolean): Intent[] {
  const icon = (I: typeof Briefcase) => <I aria-hidden="true" size={30} />
  return [
    { key: 'job', icon: icon(Briefcase), to: '/jobs' },
    ...(signedIn ? [{ key: 'applications', icon: icon(ClipboardList), to: '/applications' }] : []),
    {
      key: 'profile',
      icon: icon(UserRound),
      to: signedIn ? '/onboarding' : '/register?next=%2Fonboarding&reason=profile',
    },
    {
      key: 'support',
      icon: icon(HeartHandshake),
      to: signedIn ? '/support/new' : '/register?next=%2Fsupport%2Fnew&reason=support',
    },
    { key: 'learn', icon: icon(Compass) },
  ]
}

function FirstVisit() {
  const t = useT()
  const [started, setStarted] = useState(false) // "Help me get started"
  const headingRef = useFocusOnChange(started)
  return started ? (
    <GetStarted headingRef={headingRef} onDone={() => setStarted(false)} />
  ) : (
    <Home
      headingRef={headingRef}
      title={
        <>
          <span className="block text-2xl font-bold text-primary sm:text-3xl">
            {t('welcome2.hello')}{' '}
          </span>
          <span className="block">{t('start.intent.title')}</span>
        </>
      }
      lead={t('welcome2.lead')}
      choices={intents(false)}
      onStarted={() => setStarted(true)}
      footer={
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Link to="/sign-in" className="inline-flex min-h-11 items-center font-semibold underline">
            {t('start.intent.signIn')}
          </Link>
          <Link to="/sign-in" className="inline-flex min-h-11 items-center underline">
            {t('start.intent.employer')}
          </Link>
        </div>
      }
    />
  )
}

/** The welcome screen: hero (question + language + voice + options) and the large choices. */
function Home({
  headingRef,
  title,
  lead,
  choices,
  onStarted,
  footer,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  title: ReactNode
  lead: string
  choices: Intent[]
  onStarted: () => void
  footer?: ReactNode
}) {
  const t = useT()
  const navigate = useNavigate()
  const guide = useAudioGuide()
  const choicesId = useId()
  const label = (k: string) => t(`start.intent.${k}.label`)
  const open = (c: Intent) => (c.to ? navigate(c.to) : onStarted())
  const [justActivated, setJustActivated] = useState(false)

  // Read the screen when the voice guide is on: the question, the numbered choices, and how to answer.
  useScreenAudio(
    () =>
      [
        justActivated ? t('audio.activated') : '',
        headingRef.current?.innerText.replace(/\s+/g, ' ').trim() ?? '',
        lead,
        ...choices.map((c, i) => `${i + 1}. ${label(c.key)}.`),
        t('welcome2.howToChoose'),
      ]
        .filter(Boolean)
        .join(' '),
    guide,
    `${justActivated}`,
  )

  return (
    <div data-flow="welcome" className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="af-hero af-enter grid items-center gap-6 p-5 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <h1
            ref={headingRef}
            tabIndex={-1}
            data-page-heading
            className="text-3xl font-extrabold leading-tight [overflow-wrap:anywhere] sm:text-5xl"
          >
            {title}
          </h1>
          <p data-page-lead className="max-w-xl text-xl text-muted">
            {lead}
          </p>
          <AccessBar onActivated={() => setJustActivated(true)} />
        </div>
        <Illustration />
      </section>

      <section aria-labelledby={choicesId} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id={choicesId} className="text-2xl font-bold">
            {t('welcome2.choicesTitle')}
          </h2>
          <VoiceAnswer
            prominent={guide.active}
            label={t('welcome2.voiceChoose')}
            options={choices.map((c) => ({ value: c.key, label: label(c.key) }))}
            onOption={(key) => {
              const c = choices.find((x) => x.key === key)
              if (c) window.setTimeout(() => open(c), 900) // let the confirmation be heard first
            }}
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {choices.map((c, i) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => open(c)}
                className="af-card af-lift flex h-full min-h-28 w-full items-center gap-5 p-5 text-left hover:border-primary"
              >
                <span
                  className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                  aria-hidden="true"
                >
                  {c.icon}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-xl font-bold">
                    <span className="sr-only">{i + 1}. </span>
                    {label(c.key)}
                  </span>
                  <span className="text-muted">{t(`start.intent.${c.key}.detail`)}</span>
                </span>
                <ArrowRight aria-hidden="true" className="ml-auto shrink-0 text-primary" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      {footer}
    </div>
  )
}

/**
 * Language, the voice guide and accessibility options - on the welcome screen itself, before any choice.
 * Turning the voice guide off is the "screen reader" experience: ACCESSFLOW stays silent.
 */
function AccessBar({ onActivated }: { onActivated: () => void }) {
  const t = useT()
  const { prefs, update } = usePreferences()
  const guide = useAudioGuide()
  const [more, setMore] = useState(false)
  const langId = useId()
  const moreId = useId()
  const pill = (on: boolean) =>
    `af-transition min-h-11 rounded-full border-2 px-4 font-semibold ${on ? 'border-primary bg-primary text-on-primary' : 'border-field bg-surface hover:border-primary'}`
  const toggle = (on: boolean, label: string, icon: ReactNode, onChange: (v: boolean) => void) => (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-field bg-surface px-4 font-semibold">
      <input
        type="checkbox"
        role="switch"
        checked={on}
        aria-checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 accent-[var(--af-primary)]"
      />
      <span aria-hidden="true" className="text-primary">
        {icon}
      </span>
      {label}
    </label>
  )

  return (
    <section aria-label={t('welcome2.accessTitle')} className="flex flex-col gap-4">
      <button
        type="button"
        aria-pressed={guide.active}
        onClick={() => {
          if (guide.active) guide.deactivate()
          else {
            onActivated()
            update(usageModePatch('listen'))
          }
        }}
        className="af-lift flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 border-primary bg-primary px-5 py-3 text-left text-on-primary hover:bg-primary-strong sm:w-fit"
      >
        <Volume2 aria-hidden="true" size={32} className="shrink-0" />
        <span className="flex flex-col">
          {AUDIO_LABEL.map((l, i) => (
            <span
              key={l.lang}
              lang={l.lang}
              className={i === 0 ? 'text-xl font-extrabold' : 'font-semibold'}
            >
              {l.text}
              {i === 0 && <span className="sr-only"> · </span>}
            </span>
          ))}
        </span>
        <span
          className="ml-2 rounded-full bg-on-primary px-3 py-1 text-sm font-bold text-primary"
          aria-hidden="true"
        >
          {guide.active ? t('welcome2.on') : t('welcome2.off')}
        </span>
      </button>

      <div role="group" aria-labelledby={langId} className="flex flex-wrap items-center gap-2">
        <span id={langId} className="mr-1 font-bold">
          {t('welcome2.language')}
        </span>
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={prefs.locale === l.code}
            onClick={() => update({ locale: l.code as Locale })}
            className={pill(prefs.locale === l.code)}
          >
            {l.nativeName}
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          aria-expanded={more}
          aria-controls={moreId}
          onClick={() => setMore(!more)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-primary underline underline-offset-4"
        >
          <SlidersHorizontal aria-hidden="true" size={20} />
          {t('welcome2.moreOptions')}
        </button>
        <div id={moreId} hidden={!more} className="mt-3 grid gap-2 sm:grid-cols-2">
          {toggle(prefs.simplifiedLanguage, t('start.mode.simple'), <WholeWord size={20} />, (v) =>
            update({ simplifiedLanguage: v }),
          )}
          {toggle(prefs.textScale >= 150, t('welcome2.biggerText'), <Type size={20} />, (v) =>
            update({ textScale: v ? 150 : 100 }),
          )}
          {toggle(prefs.highContrast, t('welcome2.highContrast'), <Contrast size={20} />, (v) =>
            update({ highContrast: v }),
          )}
          {toggle(prefs.usageMode === 'sign', t('welcome2.pictures'), <Hand size={20} />, (v) =>
            update(
              v ? usageModePatch('sign') : { usageMode: null, captions: false, readAloud: true },
            ),
          )}
          <Link
            to="/settings"
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            {t('helpMenu.allSettings')}
          </Link>
        </div>
      </div>
    </section>
  )
}

/** "Help me get started": a one-minute guide and the most useful settings, then back to the choices. */
function GetStarted({
  headingRef,
  onDone,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onDone: () => void
}) {
  const t = useT()
  const guide = useAudioGuide()
  const points = [1, 2, 3, 4, 5].map((n) => t(`start.tour.p${n}`))
  useScreenAudio(() => `${t('start.tour.title')}. ${points.join(' ')}`, guide)
  return (
    <div data-flow="get-started" className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 ref={headingRef} tabIndex={-1} data-page-heading className="text-4xl font-extrabold">
        {t('start.tour.title')}
      </h1>
      <ol className="af-card flex list-decimal flex-col gap-3 p-6 pl-12 text-lg">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <div className="af-card p-6">
        <AccessBar onActivated={() => undefined} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onDone}
          className="af-lift inline-flex min-h-14 items-center gap-2 rounded-2xl bg-primary px-6 text-lg font-bold text-on-primary hover:bg-primary-strong"
        >
          <ArrowLeft aria-hidden="true" size={20} />
          {t('start.tour.done')}
        </button>
      </div>
    </div>
  )
}

/** Returning visit: one sentence, one main action, and "Something else". */
function ReturningVisit({ name }: { name: string }) {
  const t = useT()
  const navigate = useNavigate()
  const guide = useAudioGuide()
  const notes = useApi<NotificationItem[]>('/api/v1/notifications')
  const drafts = useApi<Draft[]>('/api/v1/drafts')
  const apps = useApi<ApplicationSummary[]>('/api/v1/applications')
  const profile = useApi<Profile>('/api/v1/profile')
  const [other, setOther] = useState(false)
  const [started, setStarted] = useState(false)
  const headingRef = useFocusOnChange(`${other}${started}`)

  if (notes.loading || drafts.loading || apps.loading || profile.loading)
    return <Loading label={t('app.loading')} />

  const news = (notes.data ?? []).find((n) => !n.read && n.type === 'APPLICATION_STATUS')
  const applied = new Set((apps.data ?? []).map((a) => a.jobId))
  const unfinished = (drafts.data ?? []).find(
    (d) =>
      (d.flowKey === 'job-application' && !applied.has(d.context)) ||
      d.flowKey === 'profile' ||
      d.flowKey === 'support-request',
  )

  let main: { sentence: string; button: string; go: () => void } | null = null
  if (news)
    main = {
      sentence: t('notifications.APPLICATION_STATUS', {
        jobTitle: news.params.jobTitle,
        status: t(`applications.status.${news.params.status}`),
      }),
      button: t('start.returning.open'),
      go: () => {
        void api.post(`/api/v1/notifications/${news.id}/read`).catch(() => undefined)
        navigate('/applications')
      },
    }
  else if (unfinished || profileUnfinished(profile.data))
    main = {
      sentence: t(
        `start.returning.unfinished.${!unfinished ? 'profile' : unfinished.context.startsWith('job:') ? 'job-application' : unfinished.flowKey}`,
      ),
      button: t('app.continue'),
      go: () => navigate(unfinished ? continueUrl(unfinished) : '/onboarding'),
    }

  const welcome = t('start.returning.welcome', { name })
  if (started) return <GetStarted headingRef={headingRef} onDone={() => setStarted(false)} />
  if (!main || other)
    return (
      <Home
        headingRef={headingRef}
        title={
          <>
            {!other && (
              <span className="block text-2xl font-bold text-primary sm:text-3xl">{welcome} </span>
            )}
            <span className="block">{t('start.intent.title')}</span>
          </>
        }
        lead={t('welcome2.lead')}
        choices={intents(true)}
        onStarted={() => setStarted(true)}
      />
    )
  return (
    <MainAction
      headingRef={headingRef}
      welcome={welcome}
      main={main}
      onOther={() => setOther(true)}
      guide={guide}
    />
  )
}

function MainAction({
  headingRef,
  welcome,
  main,
  onOther,
  guide,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  welcome: string
  main: { sentence: string; button: string; go: () => void }
  onOther: () => void
  guide: ReturnType<typeof useAudioGuide>
}) {
  const t = useT()
  useScreenAudio(
    () => `${welcome} ${main.sentence} 1. ${main.button}. 2. ${t('start.returning.other')}.`,
    guide,
  )
  return (
    <div data-flow="returning-visit" className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="af-hero af-enter flex flex-col gap-5 p-6 sm:p-10">
        <h1
          ref={headingRef}
          tabIndex={-1}
          data-page-heading
          className="text-4xl font-extrabold leading-tight"
        >
          {welcome}
        </h1>
        <p data-page-lead className="text-2xl">
          {main.sentence}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={main.go}
            className="af-lift inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-xl font-bold text-on-primary hover:bg-primary-strong"
          >
            {main.button}
            <ArrowRight aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOther}
            className="af-lift inline-flex min-h-16 items-center justify-center rounded-2xl border-2 border-primary bg-surface px-8 text-xl font-bold text-primary"
          >
            {t('start.returning.other')}
          </button>
        </div>
        <VoiceAnswer
          prominent={guide.active}
          options={[
            { value: 'main', label: main.button },
            { value: 'other', label: t('start.returning.other') },
          ]}
          onOption={(v) => window.setTimeout(() => (v === 'main' ? main.go() : onOther()), 900)}
        />
      </section>
    </div>
  )
}

/** Where to continue an unfinished draft. Profile drafts made while applying continue the application. */
function continueUrl(d: Draft) {
  if (d.flowKey === 'job-application') return `/jobs/${d.context}/apply`
  if (d.flowKey === 'profile' && d.context.startsWith('job:'))
    return `/jobs/${d.context.slice(4)}/apply`
  if (d.flowKey === 'profile' && d.context === 'identity') return '/identity'
  if (d.flowKey === 'profile' && ['about', 'work', 'skills', 'support'].includes(d.context))
    return `/onboarding?part=${d.context}`
  if (d.flowKey === 'profile') return '/onboarding'
  return '/support/new'
}

/** Decorative illustration: a person with headphones on a path towards a briefcase (hidden from assistive tech). */
function Illustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      aria-hidden="true"
      focusable="false"
      className="mx-auto hidden w-full max-w-sm sm:block"
    >
      <circle cx="160" cy="120" r="110" fill="var(--af-primary-soft)" />
      <path
        d="M40 200 C 110 150, 170 230, 280 150"
        fill="none"
        stroke="var(--af-primary)"
        strokeWidth="6"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />
      <circle cx="120" cy="88" r="26" fill="var(--af-accent)" />
      <path d="M86 92 a34 34 0 0 1 68 0" fill="none" stroke="var(--af-ink)" strokeWidth="7" />
      <rect x="80" y="88" width="14" height="22" rx="6" fill="var(--af-ink)" />
      <rect x="146" y="88" width="14" height="22" rx="6" fill="var(--af-ink)" />
      <path d="M84 176 q36 -64 72 0 z" fill="var(--af-primary)" />
      <rect x="218" y="96" width="62" height="46" rx="10" fill="var(--af-primary)" />
      <rect
        x="236"
        y="84"
        width="26"
        height="16"
        rx="5"
        fill="none"
        stroke="var(--af-primary)"
        strokeWidth="6"
      />
      <circle cx="249" cy="119" r="6" fill="var(--af-on-primary)" />
      <path
        d="M200 52 q14 -14 28 0 q14 14 28 0"
        fill="none"
        stroke="var(--af-accent)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M212 34 q8 -8 16 0"
        fill="none"
        stroke="var(--af-accent)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ---- Helpers -----------------------------------------------------------------------------------------------------

/** Moves focus to the screen's heading whenever the screen changes (not on the first render). */
function useFocusOnChange(key: unknown) {
  const ref = useRef<HTMLHeadingElement | null>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ref.current?.focus()
    const title = ref.current?.innerText.replace(/\s+/g, ' ').trim()
    if (title) document.title = `${title} · ACCESSFLOW`
  }, [key])
  return ref
}

/** With the audio guide on, reads the screen once when it appears (and again when `again` changes). */
function useScreenAudio(text: () => string, guide: ReturnType<typeof useAudioGuide>, again = '') {
  const textRef = useRef(text)
  useEffect(() => {
    textRef.current = text
  })
  const say = useCallback(() => guide.say(textRef.current()), [guide])
  useEffect(() => {
    const timer = window.setTimeout(say, 300)
    return () => window.clearTimeout(timer)
  }, [say, again])
}

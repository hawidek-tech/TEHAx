import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  ClipboardList,
  Ear,
  Eye,
  Hand,
  HeartHandshake,
  Keyboard,
  UserRound,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAudioGuide } from '../../a11y/audioGuide'
import { usageModePatch, usePreferences } from '../../a11y/preferences'
import { speech, useSpeech } from '../../a11y/speech'
import { Loading } from '../../design-system/Layout'
import { LOCALES } from '../../i18n'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type {
  ApplicationSummary,
  Draft,
  Locale,
  NotificationItem,
  Profile,
  UsageMode,
} from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { profileUnfinished } from './profileParts'

/**
 * Front door (docs/ux/first-visit-flow.md).
 * First visit: Start → language → how do you want to use ACCESSFLOW → what would you like to do today.
 * Returning visit: one spoken sentence and one main action (news, unfinished work, or the choices).
 */
export default function WelcomePage() {
  const { me } = useSession()
  const t = useT()
  if (me === undefined) return <Loading label={t('app.loading')} />
  if (me?.roles.includes('EMPLOYER')) return <Navigate to="/employer" replace />
  if (me?.roles.includes('SUPPORT_STAFF')) return <Navigate to="/staff" replace />
  return me ? <ReturningVisit name={me.displayName} /> : <FirstVisit />
}

/** "Start" and "Choose your language" in every language; shown/spoken together before a language is chosen. */
const START: Record<Locale, string> = {
  en: 'Start',
  am: 'ጀምር',
  om: 'Jalqabi',
  so: 'Bilow',
  ti: 'ጀምር',
}
const CHOOSE_LANGUAGE: Record<Locale, string> = {
  en: 'Choose your language',
  am: 'ቋንቋዎን ይምረጡ',
  om: 'Afaan kee filadhu',
  so: 'Dooro luqaddaada',
  ti: 'ቋንቋኻ ምረጽ',
}
/** "Activate Audio Accessibility" in English and Amharic on the very first screen (Track 1 requirement). */
const AUDIO: Partial<Record<Locale, string>> = {
  en: 'Activate Audio Accessibility',
  am: 'የድምፅ ተደራሽነትን አብራ',
}
const INTRO_ID = 'first-visit'

type Screen = 'start' | 'language' | 'mode' | 'intent' | 'tour'

function FirstVisit() {
  const t = useT()
  const { prefs, update } = usePreferences()
  const [params] = useSearchParams()
  const [screen, setScreen] = useState<Screen>(() =>
    params.get('setup') ? 'language' : prefs.usageMode ? 'intent' : 'start',
  )
  const [audioFirst, setAudioFirst] = useState(false)
  // Spoken introduction runs only after the person pressed Start and until they choose how to use ACCESSFLOW.
  const [intro, setIntro] = useState(false)
  const headingRef = useFocusOnChange(screen)

  const go = (next: Screen) => {
    speech.stop()
    setScreen(next)
  }

  useEffect(() => {
    if (!intro) return
    if (screen === 'language')
      speech.speakQueue(
        INTRO_ID,
        LOCALES.map((l) => ({ text: CHOOSE_LANGUAGE[l.code as Locale], locale: l.code })),
      )
  }, [intro, screen])

  const chooseMode = (mode: UsageMode) => {
    speech.stop()
    setIntro(false)
    update(usageModePatch(mode))
    setScreen('intent')
  }

  return (
    <div data-flow="first-visit" className="mx-auto flex max-w-3xl flex-col gap-6">
      {screen === 'start' && (
        <>
          <h1 ref={headingRef} tabIndex={-1} data-page-heading className="sr-only">
            ACCESSFLOW
          </h1>
          <button
            type="button"
            onClick={() => {
              setIntro(true)
              setScreen('language')
            }}
            className="af-transition flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 rounded-3xl border-4 border-primary bg-primary px-6 py-10 text-on-primary hover:bg-primary-strong"
          >
            <span className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-4xl font-extrabold">
              {LOCALES.map((l, i) => (
                <span key={l.code} lang={l.code}>
                  {START[l.code as Locale]}
                  {i < LOCALES.length - 1 && <span aria-hidden="true"> ·</span>}
                </span>
              ))}
            </span>
          </button>
          {/* One touch: spoken guidance from the very first screen (also offered later as "Read it to me"). */}
          <button
            type="button"
            onClick={() => {
              update(usageModePatch('listen'))
              setAudioFirst(true)
              setIntro(true)
              setScreen('language')
            }}
            className="af-transition flex min-h-24 w-full items-center justify-center gap-4 rounded-3xl border-4 border-primary bg-primary-soft px-6 py-4 text-primary hover:bg-surface"
          >
            <Volume2 aria-hidden="true" size={40} />
            <span className="flex flex-col text-2xl font-extrabold">
              {(['en', 'am'] as Locale[]).map((l, i) => (
                <span key={l} lang={l}>
                  {AUDIO[l]}
                  {i === 0 && <span className="sr-only"> · </span>}
                </span>
              ))}
            </span>
          </button>
        </>
      )}

      {screen === 'language' && (
        <ChoiceScreen
          headingRef={headingRef}
          title={
            <span className="flex flex-col gap-1">
              {LOCALES.map((l) => (
                <span
                  key={l.code}
                  lang={l.code}
                  className={l.code === prefs.locale ? '' : 'sr-only'}
                >
                  {CHOOSE_LANGUAGE[l.code as Locale]}
                </span>
              ))}
            </span>
          }
          onBack={params.get('setup') ? undefined : () => go('start')}
          extra={intro && <StopSound />}
        >
          {LOCALES.map((l) => (
            <BigChoice
              key={l.code}
              lang={l.code}
              pressed={prefs.locale === l.code}
              onClick={() => {
                speech.stop()
                update({ locale: l.code as Locale })
                // Audio was already chosen on the first screen: no need to ask how to use ACCESSFLOW again.
                setScreen(audioFirst ? 'intent' : 'mode')
              }}
              label={l.nativeName}
              detail={l.nativeName !== l.englishName ? l.englishName : undefined}
              detailLang="en"
            />
          ))}
        </ChoiceScreen>
      )}

      {screen === 'mode' && (
        <ModeScreen
          headingRef={headingRef}
          intro={intro}
          onBack={() => go('language')}
          onChoose={chooseMode}
        />
      )}

      {screen === 'intent' && (
        <IntentScreen
          headingRef={headingRef}
          title={t('start.intent.title')}
          onTour={() => go('tour')}
          extraLinks={
            <>
              <Link
                to="/sign-in"
                className="inline-flex min-h-11 items-center font-semibold underline"
              >
                {t('start.intent.signIn')}
              </Link>
              <Link to="/sign-in" className="inline-flex min-h-11 items-center underline">
                {t('start.intent.employer')}
              </Link>
              <button
                type="button"
                onClick={() => go('language')}
                className="inline-flex min-h-11 items-center underline"
              >
                {t('start.intent.changeSetup')}
              </button>
            </>
          }
        />
      )}

      {screen === 'tour' && <Tour headingRef={headingRef} onDone={() => go('intent')} />}
    </div>
  )
}

function ModeScreen({
  headingRef,
  intro,
  onBack,
  onChoose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  intro: boolean
  onBack: () => void
  onChoose: (m: UsageMode) => void
}) {
  const t = useT()
  const { prefs, update } = usePreferences()
  const modes: { mode: UsageMode; icon: ReactNode }[] = [
    { mode: 'listen', icon: <Ear aria-hidden="true" size={28} /> },
    { mode: 'screenReader', icon: <Keyboard aria-hidden="true" size={28} /> },
    { mode: 'read', icon: <Eye aria-hidden="true" size={28} /> },
    { mode: 'sign', icon: <Hand aria-hidden="true" size={28} /> },
  ]
  useEffect(() => {
    if (!intro) return
    // The person pressed Start and has not chosen yet: read this screen in the chosen language (if there is a voice).
    speech.speak(
      INTRO_ID,
      [
        t('start.mode.title'),
        ...modes.map((m, i) => `${i + 1}. ${t(`start.mode.${m.mode}.label`)}`),
      ].join('. '),
      prefs.locale,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, prefs.locale])
  return (
    <ChoiceScreen
      headingRef={headingRef}
      title={t('start.mode.title')}
      lead={t('start.mode.lead')}
      onBack={onBack}
      extra={intro && <StopSound />}
      footer={<p className="text-muted">{t('start.mode.changeLater')}</p>}
    >
      <label className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border-2 border-field px-4 text-lg font-semibold">
        <input
          type="checkbox"
          checked={prefs.simplifiedLanguage}
          onChange={(e) => update({ simplifiedLanguage: e.target.checked })}
          className="size-6 accent-[var(--af-primary)]"
        />
        {t('start.mode.simple')}
      </label>
      {modes.map((m) => (
        <BigChoice
          key={m.mode}
          icon={m.icon}
          pressed={prefs.usageMode === m.mode}
          onClick={() => onChoose(m.mode)}
          label={t(`start.mode.${m.mode}.label`)}
          detail={t(`start.mode.${m.mode}.detail`)}
        />
      ))}
    </ChoiceScreen>
  )
}

/** "What would you like to do today?" - shared by the first visit and the returning visit. */
function IntentScreen({
  headingRef,
  title,
  lead,
  onTour,
  extraLinks,
  signedIn = false,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  title: string
  lead?: string
  onTour: () => void
  extraLinks?: ReactNode
  signedIn?: boolean
}) {
  const t = useT()
  const navigate = useNavigate()
  const guide = useAudioGuide()
  const options = [
    { key: 'job', icon: <Briefcase aria-hidden="true" size={28} />, to: '/jobs' },
    ...(signedIn
      ? [
          {
            key: 'applications',
            icon: <ClipboardList aria-hidden="true" size={28} />,
            to: '/applications',
          },
        ]
      : []),
    {
      key: 'profile',
      icon: <UserRound aria-hidden="true" size={28} />,
      to: signedIn ? '/onboarding' : '/register?next=%2Fonboarding&reason=profile',
    },
    {
      key: 'support',
      icon: <HeartHandshake aria-hidden="true" size={28} />,
      to: signedIn ? '/support/new' : '/register?next=%2Fsupport%2Fnew&reason=support',
    },
    { key: 'learn', icon: <BookOpen aria-hidden="true" size={28} /> },
  ]
  const label = (k: string) => t(`start.intent.${k}.label`)
  useScreenAudio(
    [title, lead, ...options.map((o, i) => `${i + 1}. ${label(o.key)}`)].filter(Boolean).join('. '),
    guide,
  )
  return (
    <ChoiceScreen
      headingRef={headingRef}
      title={title}
      lead={lead}
      footer={extraLinks && <div className="flex flex-wrap gap-x-6 gap-y-1">{extraLinks}</div>}
    >
      {options.map((o) => (
        <BigChoice
          key={o.key}
          icon={o.icon}
          onClick={() => (o.to ? navigate(o.to) : onTour())}
          label={label(o.key)}
          detail={t(`start.intent.${o.key}.detail`)}
        />
      ))}
    </ChoiceScreen>
  )
}

function Tour({
  headingRef,
  onDone,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onDone: () => void
}) {
  const t = useT()
  const guide = useAudioGuide()
  const points = [1, 2, 3, 4, 5].map((n) => t(`start.tour.p${n}`))
  useScreenAudio(`${t('start.tour.title')}. ${points.join(' ')}`, guide)
  return (
    <ChoiceScreen headingRef={headingRef} title={t('start.tour.title')} onBack={onDone}>
      <ol className="flex list-decimal flex-col gap-3 pl-8 text-lg">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <BigChoice onClick={onDone} label={t('start.tour.done')} />
    </ChoiceScreen>
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
  const headingRef = useFocusOnChange(other)

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
  if (!main || other)
    return (
      <div data-flow="returning-visit" className="mx-auto flex max-w-3xl flex-col gap-6">
        <IntentScreen
          headingRef={headingRef}
          title={t('start.intent.title')}
          lead={other ? undefined : welcome}
          signedIn
          onTour={() => navigate('/help')}
        />
      </div>
    )
  return (
    <div data-flow="returning-visit" className="mx-auto flex max-w-3xl flex-col gap-6">
      <MainAction
        headingRef={headingRef}
        welcome={welcome}
        main={main}
        onOther={() => setOther(true)}
        guide={guide}
      />
    </div>
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
  useScreenAudio(`${welcome} ${main.sentence} ${main.button}?`, guide)
  return (
    <ChoiceScreen headingRef={headingRef} title={welcome} lead={main.sentence}>
      <BigChoice onClick={main.go} label={main.button} primary />
      <BigChoice onClick={onOther} label={t('start.returning.other')} />
    </ChoiceScreen>
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

// ---- Building blocks ---------------------------------------------------------------------------------------------

function ChoiceScreen({
  headingRef,
  title,
  lead,
  onBack,
  extra,
  footer,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  title: ReactNode
  lead?: string
  onBack?: () => void
  extra?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  const t = useT()
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          data-page-heading
          className="text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          {title}
        </h1>
        {lead && (
          <p data-page-lead className="text-xl text-muted">
            {lead}
          </p>
        )}
        {extra}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
      {footer}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="af-transition inline-flex min-h-12 w-fit items-center gap-2 rounded-xl border-2 border-line px-4 font-semibold hover:bg-surface-2"
        >
          <ArrowLeft aria-hidden="true" size={20} />
          {t('app.back')}
        </button>
      )}
    </section>
  )
}

function BigChoice({
  label,
  detail,
  icon,
  onClick,
  pressed,
  lang,
  detailLang,
  primary,
}: {
  label: string
  detail?: string
  icon?: ReactNode
  onClick: () => void
  pressed?: boolean
  lang?: string
  detailLang?: string
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed === undefined ? undefined : pressed}
      className={`af-transition flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left ${
        primary
          ? 'border-primary bg-primary text-on-primary hover:bg-primary-strong'
          : pressed
            ? 'border-primary bg-primary-soft'
            : 'border-field bg-surface hover:border-primary hover:bg-primary-soft'
      }`}
    >
      {icon && <span className={primary ? '' : 'text-primary'}>{icon}</span>}
      <span className="flex flex-col">
        <span lang={lang} className="text-xl font-bold">
          {label}
        </span>
        {detail && (
          <span lang={detailLang} className={primary ? '' : 'text-muted'}>
            {detail}
          </span>
        )}
      </span>
    </button>
  )
}

function StopSound() {
  const t = useT()
  const s = useSpeech()
  if (s.id !== INTRO_ID || s.state === 'idle') return null
  return (
    <button
      type="button"
      onClick={() => speech.stop()}
      className="af-transition inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border-2 border-line px-3 font-semibold hover:bg-surface-2"
    >
      <VolumeX aria-hidden="true" size={18} />
      {t('start.stopSound')}
    </button>
  )
}

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
    const title = ref.current?.innerText.trim()
    if (title) document.title = `${title} · ACCESSFLOW`
  }, [key])
  return ref
}

/** With the audio guide on, reads the screen once when it appears (only spoken while the guide is active). */
function useScreenAudio(text: string, guide: ReturnType<typeof useAudioGuide>) {
  const say = useCallback(() => guide.say(text), [guide, text])
  useEffect(() => {
    const timer = window.setTimeout(say, 300)
    return () => window.clearTimeout(timer)
  }, [say])
}

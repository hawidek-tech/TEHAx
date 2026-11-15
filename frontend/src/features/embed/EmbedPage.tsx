import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { usePreferences } from '../../a11y/preferences'
import { VoiceToggle } from '../../app/HelpMenu'
import { CaptionBar } from '../../a11y/ReadAloud'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Badge, Loading } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import type { FlowDefinition } from '../../engine/types'
import { LOCALES } from '../../i18n'
import { useT } from '../../i18n/useT'
import { ApiError, api, setEmbedMode } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { ApplicationSummary, JobDetail, JobSummary, Locale, Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { DateText } from '../shared/DateText'
import {
  MINIMUM_FOR_APPLYING,
  SUPPORT_STEPS,
  answeredSteps,
  namesFromDisplayName,
  profileAnswers,
  subsetDefinition,
} from '../onboarding/profileParts'
import { registrationShortcuts } from '../onboarding/registrationShortcuts'

interface EmbedConfig {
  partnerName: string
  publishableKey: string
  allowedOrigins: string[]
  components: string[]
}
type Post = (type: string, payload?: Record<string, unknown>) => void

const VIEWS = ['signup', 'profile', 'jobs', 'job-application']
const COMPONENT_OF: Record<string, string> = {
  signup: 'signup',
  profile: 'profile',
  jobs: 'job-application',
  'job-application': 'job-application',
}
const EDITABLE = ['about', 'location', 'work', 'education']

/** Relative luminance contrast against white (WCAG); host accents below 4.5:1 are ignored to keep text readable. */
function contrastWithWhite(hex: string) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return 1.05 / (l + 0.05)
}

/**
 * Page rendered inside the host's iframe by db-signup.js / accessflow.js.
 * Security: the server only lets registered origins frame this page (CSP frame-ancestors); this page also checks the
 * parent origin and posts messages ONLY to it. Messages never contain personal data.
 */
export default function EmbedPage() {
  const { component: view = '' } = useParams()
  const [params] = useSearchParams()
  const t = useT()
  const { prefs, update } = usePreferences()
  const key = params.get('key') ?? ''
  const parentOrigin = params.get('origin') ?? ''
  const jobId = params.get('job') ?? ''
  const [config, setConfig] = useState<EmbedConfig | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    const l = params.get('locale') ?? params.get('lang')
    if (l && LOCALES.some((x) => x.code === l)) update({ locale: l as Locale })
    const theme = params.get('theme') ?? 'auto'
    if (theme === 'high-contrast') update({ highContrast: true })
    const dark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.dataset.theme = 'dark'
    const accent = params.get('accent')
    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent) && contrastWithWhite(accent) >= 4.5 && !dark) {
      document.documentElement.style.setProperty('--af-primary', accent)
      document.documentElement.style.setProperty('--af-primary-strong', accent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const q = key ? `key=${encodeURIComponent(key)}` : `origin=${encodeURIComponent(parentOrigin)}`
    api
      .get<EmbedConfig>(`/api/v1/embed/config?${q}`)
      .then((c) => {
        const referrerOrigin = document.referrer ? new URL(document.referrer).origin : null
        const ancestor = (window.location as Location & { ancestorOrigins?: DOMStringList })
          .ancestorOrigins?.[0]
        const okOrigin =
          c.allowedOrigins.includes(parentOrigin) &&
          (!referrerOrigin || referrerOrigin === parentOrigin) &&
          (!ancestor || ancestor === parentOrigin)
        if (!okOrigin) setProblem('embed.originNotAllowed')
        else if (!VIEWS.includes(view) || !c.components.includes(COMPONENT_OF[view]))
          setProblem('embed.componentNotEnabled')
        else {
          setEmbedMode(c.publishableKey) // identifies this partner to the API (header), never a cookie
          setConfig(c)
        }
      })
      .catch((e) => setProblem(e instanceof ApiError ? e.code : 'error.network'))
  }, [key, parentOrigin, view])

  const post = useCallback<Post>(
    (type, payload = {}) => {
      if (config && window.parent !== window)
        window.parent.postMessage(
          { source: 'accessflow', type, component: view, ...payload },
          parentOrigin,
        )
    },
    [config, parentOrigin, view],
  )

  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!config) return
    post('ready')
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() =>
      post('resize', { height: Math.ceil(el.getBoundingClientRect().height) + 24 }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [config, post])

  const fullPage = useMemo(() => {
    const route =
      view === 'job-application' && jobId
        ? `/jobs/${jobId}/apply`
        : view === 'jobs'
          ? '/jobs'
          : view === 'profile'
            ? '/profile'
            : '/preview'
    return `${route}?partner=${encodeURIComponent(config?.publishableKey ?? key)}`
  }, [view, jobId, key, config])

  return (
    <div ref={rootRef} className="bg-bg p-4 text-ink">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <p className="text-lg font-extrabold text-primary">
          ACCESSFLOW
          {config && (
            <span className="ml-2 text-sm font-semibold text-muted">
              · {t('embed.withPartner', { partner: config.partnerName })}
            </span>
          )}
        </p>
        <span className="flex flex-wrap items-center gap-2">
          <VoiceToggle />
          <label className="flex items-center gap-2 text-sm font-semibold">
            {t('prefs.language')}
            <select
              value={prefs.locale}
              onChange={(e) => update({ locale: e.target.value as Locale })}
              className="min-h-11 rounded-lg border-2 border-field bg-surface px-2"
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code} lang={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </label>
        </span>
      </header>
      <main>
        <h1 data-page-heading tabIndex={-1} className="mb-4 text-2xl font-bold">
          {t(`embed.titles.${VIEWS.includes(view) ? view : 'signup'}`)}
        </h1>
        {problem ? (
          <Alert tone="error" title={t('embed.problemTitle')}>
            {t(`errors.${problem}`)}
          </Alert>
        ) : !config ? (
          <Loading label={t('app.loading')} />
        ) : (
          <EmbedContent view={view} jobId={jobId} post={post} />
        )}
        <p className="mt-6 rounded-xl bg-surface-2 p-3">
          {t('embed.fallbackLead')}{' '}
          <a
            href={fullPage}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline"
          >
            {t('embed.openFullPage')}
            <ExternalLink size={16} aria-hidden="true" />
            <span className="sr-only">({t('app.opensNewTab')})</span>
          </a>
        </p>
      </main>
      <CaptionBar />
    </div>
  )
}

function EmbedContent({ view, jobId, post }: { view: string; jobId: string; post: Post }) {
  const t = useT()
  const { me, register, signOut } = useSession()
  const [mode, setMode] = useState<'register' | 'signin'>(view === 'signup' ? 'register' : 'signin')
  const [done, setDone] = useState<string | null>(null)
  const onStep = useCallback(
    (info: { stepId: string; index: number; total: number; section?: string }) =>
      post('step', info),
    [post],
  )
  const registration = useApi<FlowDefinition>(
    view === 'signup' && !me ? '/api/v1/forms/registration' : null,
  )

  if (done)
    return (
      <Alert tone="success" title={t('embed.doneTitle')}>
        {t(done)}
      </Alert>
    )
  if (me === undefined) return <Loading label={t('app.loading')} />

  if (!me) {
    if (mode === 'signin' || view !== 'signup') {
      return (
        <>
          {view === 'jobs' && <JobsGateway post={post} onStep={onStep} signedIn={false} />}
          <EmbedSignIn />
          <Button variant="ghost" className="mt-3" onClick={() => setMode('register')}>
            {t('auth.createAccount')}
          </Button>
          {mode === 'register' && view !== 'signup' && <RegisterInline onStep={onStep} />}
        </>
      )
    }
    if (!registration.data) return <Loading label={t('app.loading')} />
    return (
      <>
        <FlowRunner
          definition={registration.data}
          flowKey="registration"
          draftOwner={null}
          serverDrafts={false}
          {...registrationShortcuts(t)}
          submitLabel={t('auth.createAccount')}
          onStepChange={onStep}
          onSubmit={async (d) => {
            await register({
              displayName: d.displayName,
              email: d.contactMethod === 'email' ? d.email : undefined,
              phone: d.contactMethod === 'phone' ? d.phone : undefined,
              password: d.password,
              acceptPrivacyNotice: d.acceptPrivacy === true,
            })
          }}
        />
        <Button variant="ghost" className="mt-3" onClick={() => setMode('signin')}>
          {t('auth.haveAccount')} {t('auth.signIn')}
        </Button>
      </>
    )
  }

  const signedInBar = (
    <p className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>{t('embed.signedInAs', { name: me.displayName })}</span>
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        {t('app.signOut')}
      </Button>
    </p>
  )

  if (view === 'signup')
    return (
      <>
        {signedInBar}
        <SignupProfile post={post} onStep={onStep} onDone={(k) => setDone(k)} meId={me.id} />
      </>
    )
  if (view === 'profile')
    return (
      <>
        {signedInBar}
        <ProfileEditor post={post} onStep={onStep} onDone={(k) => setDone(k)} />
      </>
    )
  if (view === 'jobs')
    return (
      <>
        {signedInBar}
        <JobsGateway post={post} onStep={onStep} signedIn onDone={(k) => setDone(k)} />
      </>
    )
  if (!jobId) return <Alert tone="error">{t('errors.error.notFound')}</Alert>
  return (
    <>
      {signedInBar}
      <ApplyInFrame jobId={jobId} post={post} onStep={onStep} onDone={(k) => setDone(k)} />
    </>
  )
}

type StepFn = (info: { stepId: string; index: number; total: number; section?: string }) => void

function RegisterInline({ onStep }: { onStep: StepFn }) {
  const t = useT()
  const { register } = useSession()
  const flow = useApi<FlowDefinition>('/api/v1/forms/registration')
  if (!flow.data) return <Loading label={t('app.loading')} />
  return (
    <div className="mt-4">
      <FlowRunner
        definition={flow.data}
        flowKey="registration"
        draftOwner={null}
        serverDrafts={false}
        {...registrationShortcuts(t)}
        submitLabel={t('auth.createAccount')}
        onStepChange={onStep}
        onSubmit={async (d) => {
          await register({
            displayName: d.displayName,
            email: d.contactMethod === 'email' ? d.email : undefined,
            phone: d.contactMethod === 'phone' ? d.phone : undefined,
            password: d.password,
            acceptPrivacyNotice: d.acceptPrivacy === true,
          })
        }}
      />
    </div>
  )
}

function SignupProfile({
  post,
  onStep,
  onDone,
  meId,
}: {
  post: Post
  onStep: StepFn
  onDone: (k: string) => void
  meId: string
}) {
  const t = useT()
  const { me } = useSession()
  const flow = useApi<FlowDefinition>('/api/v1/forms/profile')
  const profile = useApi<Profile>('/api/v1/profile')
  const [stage, setStage] = useState<'minimum' | 'support'>('minimum')
  if (!flow.data || !profile.data) return <Loading label={t('app.loading')} />
  if (profile.data.completed && stage === 'minimum')
    return (
      <Alert tone="success" title={t('embed.profileReadyTitle')}>
        {t('embed.profileReady')}
      </Alert>
    )
  // Short sign-up: the few details employers need (names pre-filled from the account name), then one optional,
  // private question about support. The rest of the profile can be added later in the full profile.
  if (stage === 'minimum') {
    const known = { ...namesFromDisplayName(me?.displayName), ...profileAnswers(profile.data) }
    const prefilled = answeredSteps(MINIMUM_FOR_APPLYING, known)
    return (
      <FlowRunner
        key="minimum"
        definition={subsetDefinition(flow.data, MINIMUM_FOR_APPLYING)}
        flowKey="profile"
        context="embed-signup"
        draftOwner={null}
        serverDrafts
        initial={Object.fromEntries(prefilled.map((id) => [id, known[id]]))}
        skipSteps={prefilled}
        submitLabel={t('app.continue')}
        onStepChange={onStep}
        onSubmit={async (data) => {
          await api.put(`/api/v1/profile/steps?steps=${MINIMUM_FOR_APPLYING.join(',')}`, data)
          setStage('support')
        }}
      />
    )
  }
  return (
    <FlowRunner
      key="support"
      definition={subsetDefinition(
        flow.data,
        SUPPORT_STEPS.filter((id) => id !== 'workplaceSupport'),
      )}
      flowKey="profile"
      context="embed-support"
      draftOwner={null}
      serverDrafts
      submitLabel={t('onboarding.submit')}
      onStepChange={onStep}
      onSubmit={async (data) => {
        if (data.supportNeeded === 'yes') {
          await api.put(`/api/v1/learners/${meId}/support`, {
            workplaceSupport: profile.data?.supportPreferences ?? [],
            request: {
              category: data.supportCategory,
              message: data.supportMessage,
              contact: data.supportContact,
            },
          })
          post('support', { requested: true })
        }
        post('completed', { reference: meId })
        onDone('embed.signupDone')
      }}
    />
  )
}

/** Profile editing inside the host page, with the same engine and validation as the main app. */
function ProfileEditor({
  post,
  onStep,
  onDone,
}: {
  post: Post
  onStep: StepFn
  onDone: (k: string) => void
}) {
  const t = useT()
  const flow = useApi<FlowDefinition>('/api/v1/forms/profile')
  const profile = useApi<Profile>('/api/v1/profile')
  const def = useMemo(
    () =>
      flow.data && {
        ...flow.data,
        sections: flow.data.sections.filter((s) => EDITABLE.includes(s)),
        steps: flow.data.steps.filter((s) => EDITABLE.includes(s.section)),
      },
    [flow.data],
  )
  if (!def || !profile.data) return <Loading label={t('app.loading')} />
  const p = profile.data
  const initial = {
    givenName: p.givenName,
    fatherName: p.fatherName,
    grandfatherName: p.grandfatherName,
    birthYear: p.birthYear,
    region: p.region,
    city: p.city,
    headline: p.headline,
    summary: p.summary,
    experience: p.experience,
    education: p.education,
    skills: p.skills.join(', '),
    languages: p.languages,
  }
  return (
    <FlowRunner
      definition={def}
      flowKey="profile"
      context="edit"
      draftOwner={null}
      serverDrafts
      initial={initial}
      submitLabel={t('app.save')}
      onStepChange={onStep}
      onSubmit={async (data) => {
        await api.put('/api/v1/profile', data)
        post('completed', { reference: 'profile-updated' })
        onDone('profile.saved')
      }}
    />
  )
}

/** Career gateway: browse open jobs and apply with the same form engine. */
function JobsGateway({
  post,
  onStep,
  signedIn,
  onDone,
}: {
  post: Post
  onStep: StepFn
  signedIn: boolean
  onDone?: (k: string) => void
}) {
  const t = useT()
  const jobs = useApi<JobSummary[]>('/api/v1/jobs')
  const [selected, setSelected] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const job = useApi<JobDetail>(selected ? `/api/v1/jobs/${selected}` : null)

  if (selected && applying && signedIn && onDone) {
    return <ApplyInFrame jobId={selected} post={post} onStep={onStep} onDone={onDone} />
  }
  if (selected) {
    return (
      <section aria-labelledby="embed-job-title" className="mb-4 flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} aria-hidden="true" />}
          onClick={() => setSelected(null)}
        >
          {t('embed.backToJobs')}
        </Button>
        {!job.data ? (
          <Loading label={t('app.loading')} />
        ) : (
          <div className="af-card flex flex-col gap-3 p-5">
            <h2 id="embed-job-title" className="text-xl font-bold">
              {job.data.title}
            </h2>
            <p className="text-muted">{job.data.organizationName}</p>
            <p>{job.data.plainSummary}</p>
            {job.data.accommodations && job.data.accommodations.categories.length > 0 && (
              <div>
                <h3 className="font-semibold">{t('jobs.supportOffered')}</h3>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {job.data.accommodations.categories.map((c) => (
                    <li key={c}>
                      <Badge tone="primary">{t(`accommodations.${c}`)}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm">
              {t('jobs.deadline')}: <DateText iso={job.data.deadline} />
            </p>
            {signedIn ? (
              <Button onClick={() => setApplying(true)}>{t('jobs.apply')}</Button>
            ) : (
              <p className="font-semibold">{t('embed.signInToApply')}</p>
            )}
          </div>
        )}
      </section>
    )
  }
  return (
    <section aria-labelledby="embed-jobs-title" className="mb-4">
      <h2 id="embed-jobs-title" className="mb-2 text-xl font-bold">
        {jobs.data ? t('jobs.results', { count: jobs.data.length }) : t('jobs.resultsTitle')}
      </h2>
      {!jobs.data ? (
        <Loading label={t('app.loading')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.data.map((j) => (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => setSelected(j.id)}
                className="af-card flex w-full flex-col items-start gap-1 p-4 text-left hover:border-primary"
              >
                <span className="text-lg font-bold">{j.title}</span>
                <span className="text-sm text-muted">
                  {j.organizationName} · {t(`jobs.workMode.${j.workMode}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ApplyInFrame({
  jobId,
  post,
  onStep,
  onDone,
}: {
  jobId: string
  post: Post
  onStep: StepFn
  onDone: (k: string) => void
}) {
  const t = useT()
  const { me } = useSession()
  const form = useApi<FlowDefinition>(`/api/v1/jobs/${jobId}/application-form`)
  const profile = useApi<Profile>('/api/v1/profile')
  const mine = useApi<ApplicationSummary[]>('/api/v1/applications')
  if (form.error) return <Alert tone="error">{t(`errors.${form.error}`)}</Alert>
  if (!form.data || !mine.data) return <Loading label={t('app.loading')} />
  if (mine.data.some((a) => a.jobId === jobId))
    return <Alert tone="success">{t('jobs.alreadyApplied')}</Alert>
  return (
    <FlowRunner
      definition={form.data}
      flowKey="job-application"
      context={jobId}
      draftOwner={null}
      serverDrafts
      onStepChange={onStep}
      prefill={{
        'account.email': me?.email,
        'account.phone': me?.phone,
        'profile.summary': profile.data?.summary,
      }}
      skipSteps={me?.phone || me?.email ? ['contactPhone', 'contactEmail'] : []}
      submitLabel={t('apply.submit')}
      confirmLabel={t('apply.confirmLabel')}
      onSubmit={async (data) => {
        const r = await api.post<ApplicationSummary>(`/api/v1/jobs/${jobId}/applications`, data)
        if (data.shareAccommodation === 'yes') post('support', { requested: true })
        post('completed', { reference: r.referenceCode })
        onDone('embed.applicationDone')
      }}
    />
  )
}

function EmbedSignIn() {
  const t = useT()
  const { signIn } = useSession()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="af-card flex flex-col gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        try {
          await signIn(identifier.trim(), password)
        } catch (err) {
          setError(t(`errors.${err instanceof ApiError ? err.code : 'error.network'}`))
        }
      }}
    >
      <h2 className="text-lg font-bold">{t('auth.signInTitle')}</h2>
      {error && (
        <div role="alert">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <label className="flex flex-col gap-1 font-semibold">
        {t('auth.identifier')}
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          className="min-h-14 rounded-xl border-2 border-field bg-surface px-4 text-lg font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        {t('auth.password')}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="min-h-14 rounded-xl border-2 border-field bg-surface px-4 text-lg font-normal"
        />
      </label>
      <Button type="submit" size="lg">
        {t('auth.signInButton')}
      </Button>
    </form>
  )
}

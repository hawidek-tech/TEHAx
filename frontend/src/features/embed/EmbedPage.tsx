import { ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { usePreferences } from '../../a11y/preferences'
import { CaptionBar } from '../../a11y/ReadAloud'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Loading } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { LOCALES } from '../../i18n'
import { useT } from '../../i18n/useT'
import { ApiError, api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { ApplicationSummary, Locale, Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import type { FlowDefinition } from '../../engine/types'

interface EmbedConfig {
  partnerName: string
  allowedOrigins: string[]
  components: string[]
}
const COMPONENTS = ['signup', 'profile', 'job-application']

/**
 * Page rendered inside the partner's iframe by accessflow.js.
 * Security: the parent origin must be registered for the partner key (the server also enforces this with
 * CSP frame-ancestors); messages go ONLY to that origin and never contain personal data.
 */
export default function EmbedPage() {
  const { component = '' } = useParams()
  const [params] = useSearchParams()
  const t = useT()
  const { prefs, update } = usePreferences()
  const key = params.get('key') ?? ''
  const parentOrigin = params.get('origin') ?? ''
  const jobId = params.get('job') ?? ''
  const [config, setConfig] = useState<EmbedConfig | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    const l = params.get('locale')
    if (l && LOCALES.some((x) => x.code === l)) update({ locale: l as Locale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api
      .get<EmbedConfig>(`/api/v1/embed/config?key=${encodeURIComponent(key)}`)
      .then((c) => {
        const referrerOrigin = document.referrer ? new URL(document.referrer).origin : null
        const ancestor = (window.location as Location & { ancestorOrigins?: DOMStringList })
          .ancestorOrigins?.[0]
        const okOrigin =
          c.allowedOrigins.includes(parentOrigin) &&
          (!referrerOrigin || referrerOrigin === parentOrigin) &&
          (!ancestor || ancestor === parentOrigin)
        if (!okOrigin) setProblem('embed.originNotAllowed')
        else if (!COMPONENTS.includes(component) || !c.components.includes(component))
          setProblem('embed.componentNotEnabled')
        else setConfig(c)
      })
      .catch((e) => setProblem(e instanceof ApiError ? e.code : 'error.network'))
  }, [key, parentOrigin, component])

  const post = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      if (config && window.parent !== window)
        window.parent.postMessage(
          { source: 'accessflow', type, component, ...payload },
          parentOrigin,
        )
    },
    [config, parentOrigin, component],
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
      component === 'job-application' && jobId
        ? `/jobs/${jobId}/apply`
        : component === 'profile'
          ? '/profile'
          : '/preview'
    return `${route}?partner=${encodeURIComponent(key)}`
  }, [component, jobId, key])

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
      </header>
      <main>
        <h1 data-page-heading tabIndex={-1} className="mb-4 text-2xl font-bold">
          {t(`embed.titles.${COMPONENTS.includes(component) ? component : 'signup'}`)}
        </h1>
        {problem ? (
          <Alert tone="error" title={t('embed.problemTitle')}>
            {t(`errors.${problem}`)}
          </Alert>
        ) : !config ? (
          <Loading label={t('app.loading')} />
        ) : (
          <EmbedContent
            component={component}
            jobId={jobId}
            onCompleted={(reference) => post('completed', { reference })}
          />
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

function EmbedContent({
  component,
  jobId,
  onCompleted,
}: {
  component: string
  jobId: string
  onCompleted: (reference: string) => void
}) {
  const t = useT()
  const { me, register } = useSession()
  const [mode, setMode] = useState<'register' | 'signin'>(
    component === 'signup' ? 'register' : 'signin',
  )
  const [done, setDone] = useState<string | null>(null)
  const registration = useApi<FlowDefinition>(
    component === 'signup' && !me ? '/api/v1/forms/registration' : null,
  )
  const profileFlow = useApi<FlowDefinition>(
    me && component === 'signup' ? '/api/v1/forms/profile' : null,
  )
  const profile = useApi<Profile>(me ? '/api/v1/profile' : null)
  const appForm = useApi<FlowDefinition>(
    me && component === 'job-application' && jobId
      ? `/api/v1/jobs/${jobId}/application-form`
      : null,
  )

  if (done)
    return (
      <Alert tone="success" title={t('embed.doneTitle')}>
        {t(done)}
      </Alert>
    )

  if (!me) {
    if (mode === 'signin')
      return (
        <>
          <EmbedSignIn />
          {component === 'signup' && (
            <Button variant="ghost" className="mt-3" onClick={() => setMode('register')}>
              {t('auth.createAccount')}
            </Button>
          )}
        </>
      )
    if (!registration.data) return <Loading label={t('app.loading')} />
    return (
      <>
        <FlowRunner
          definition={registration.data}
          flowKey="registration"
          draftOwner={null}
          serverDrafts={false}
          submitLabel={t('auth.createAccount')}
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

  if (component === 'signup') {
    if (profile.data?.completed)
      return (
        <Alert tone="success" title={t('embed.profileReadyTitle')}>
          {t('embed.profileReady')}
        </Alert>
      )
    if (!profileFlow.data) return <Loading label={t('app.loading')} />
    return (
      <FlowRunner
        definition={profileFlow.data}
        flowKey="profile"
        draftOwner={null}
        serverDrafts
        submitLabel={t('onboarding.submit')}
        onSubmit={async (data) => {
          await api.post('/api/v1/onboarding/profile', data)
          onCompleted(me.id)
          setDone('embed.signupDone')
        }}
      />
    )
  }
  if (component === 'profile') {
    if (!profile.data) return <Loading label={t('app.loading')} />
    const p = profile.data
    return (
      <div className="af-card p-5">
        <p className="text-xl font-bold">
          {[p.givenName, p.fatherName].filter(Boolean).join(' ') || me.displayName}
        </p>
        <p className="text-muted">{p.headline}</p>
        <p className="mt-2">
          {p.completed ? t('embed.profileComplete') : t('embed.profileIncomplete')}
        </p>
      </div>
    )
  }
  if (!jobId) return <Alert tone="error">{t('errors.error.notFound')}</Alert>
  if (!appForm.data)
    return appForm.error ? (
      <Alert tone="error">{t(`errors.${appForm.error}`)}</Alert>
    ) : (
      <Loading label={t('app.loading')} />
    )
  return (
    <FlowRunner
      definition={appForm.data}
      flowKey="job-application"
      context={jobId}
      draftOwner={null}
      serverDrafts
      prefill={{
        'account.email': me.email,
        'account.phone': me.phone,
        'profile.summary': profile.data?.summary,
      }}
      submitLabel={t('apply.submit')}
      confirmLabel={t('apply.confirmLabel')}
      onSubmit={async (data) => {
        const r = await api.post<ApplicationSummary>(`/api/v1/jobs/${jobId}/applications`, data)
        onCompleted(r.referenceCode)
        setDone('embed.applicationDone')
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

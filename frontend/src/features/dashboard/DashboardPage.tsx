import { ArrowRight, Bell, CheckCircle2, Circle, CircleDot, FileText } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Alert } from '../../design-system/Alert'
import { LinkButton } from '../../design-system/Button'
import { Badge, Card, PageHeader, ProgressBar } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import type {
  ApplicationSummary,
  Draft,
  NotificationItem,
  Profile,
  Verification,
} from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { statusTone } from '../applications/status'

type StepState = 'done' | 'current' | 'todo'

/** Application progress tracker: completed and remaining steps, missing information, drafts and next action. */
export default function DashboardPage() {
  const t = useT()
  const { me } = useSession()
  const [params] = useSearchParams()
  const profile = useApi<Profile>('/api/v1/profile')
  const identity = useApi<Verification[]>('/api/v1/identity')
  const apps = useApi<ApplicationSummary[]>('/api/v1/applications')
  const drafts = useApi<Draft[]>('/api/v1/drafts')
  const notes = useApi<NotificationItem[]>('/api/v1/notifications')

  const p = profile.data
  const v = identity.data?.[0]
  const applications = apps.data ?? []
  const appDrafts = (drafts.data ?? []).filter((d) => d.flowKey === 'job-application')
  const profileDraft = (drafts.data ?? []).find((d) => d.flowKey === 'profile')

  const steps: {
    key: string
    state: StepState
    detail: string
    action?: { to: string; label: string }
  }[] = [
    { key: 'account', state: 'done', detail: t('dashboard.steps.account.done') },
    {
      key: 'preferences',
      state: 'done',
      detail: t('dashboard.steps.preferences.done'),
      action: { to: '/settings', label: t('dashboard.steps.preferences.action') },
    },
    p?.completed
      ? {
          key: 'profile',
          state: 'done',
          detail: p.missing.length
            ? t('dashboard.steps.profile.missing', {
                list: p.missing.map((m) => t(`profile.missing.${m}`)).join(', '),
              })
            : t('dashboard.steps.profile.done'),
          action: { to: '/profile', label: t('dashboard.steps.profile.view') },
        }
      : {
          key: 'profile',
          state: 'current',
          detail: profileDraft
            ? t('dashboard.steps.profile.inProgress')
            : t('dashboard.steps.profile.todo'),
          action: { to: '/onboarding', label: profileDraft ? t('app.continue') : t('app.start') },
        },
    v
      ? {
          key: 'identity',
          state: v.status === 'VERIFIED' ? 'done' : 'current',
          detail: t(`identity.status.${v.status}`),
          action: { to: '/identity', label: t('dashboard.steps.identity.view') },
        }
      : {
          key: 'identity',
          state: p?.completed ? 'current' : 'todo',
          detail: t('dashboard.steps.identity.todo'),
          action: { to: '/identity', label: t('app.start') },
        },
    applications.length
      ? {
          key: 'apply',
          state: 'done',
          detail: t('dashboard.steps.apply.done', { count: applications.length }),
          action: { to: '/applications', label: t('dashboard.steps.apply.view') },
        }
      : {
          key: 'apply',
          state: p?.completed ? 'current' : 'todo',
          detail: t('dashboard.steps.apply.todo'),
          action: { to: '/jobs', label: t('dashboard.steps.apply.action') },
        },
  ]
  const done = steps.filter((s) => s.state === 'done').length
  const nextStep = steps.find((s) => s.state !== 'done')

  return (
    <>
      <PageHeader
        title={t('dashboard.title', { name: me?.displayName ?? '' })}
        lead={t('dashboard.lead')}
      />
      {params.get('welcome') && (
        <div className="mb-6">
          <Alert tone="success" title={t('dashboard.welcomeTitle')}>
            {t('dashboard.welcomeBody')}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card as="section">
          <h2 className="mb-4 text-2xl font-bold">{t('dashboard.progressTitle')}</h2>
          <ProgressBar
            value={done}
            max={steps.length}
            label={t('dashboard.progressLabel', { done, total: steps.length })}
          />
          <ol className="mt-5 flex flex-col gap-3">
            {steps.map((s, i) => (
              <li
                key={s.key}
                className={`flex flex-col gap-2 rounded-xl border-2 p-4 sm:flex-row sm:items-center sm:justify-between ${s === nextStep ? 'border-primary bg-primary-soft' : 'border-line'}`}
              >
                <div className="flex items-start gap-3">
                  {s.state === 'done' ? (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
                  ) : s.state === 'current' ? (
                    <CircleDot aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                  ) : (
                    <Circle aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                  )}
                  <div>
                    <p className="font-bold">
                      {i + 1}. {t(`dashboard.steps.${s.key}.title`)}{' '}
                      <span className="font-normal text-muted">
                        — {t(`dashboard.state.${s.state}`)}
                      </span>
                    </p>
                    <p className="text-muted">{s.detail}</p>
                  </div>
                </div>
                {s.action && (
                  <Link
                    to={s.action.to}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-primary underline"
                  >
                    {s.action.label}
                    <span className="sr-only">: {t(`dashboard.steps.${s.key}.title`)}</span>
                  </Link>
                )}
              </li>
            ))}
          </ol>
          {nextStep?.action && (
            <div className="mt-5 flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
              <p className="font-bold">
                {t('dashboard.nextAction')}: {t(`dashboard.steps.${nextStep.key}.title`)}
              </p>
              <LinkButton
                to={nextStep.action.to}
                icon={<ArrowRight size={18} aria-hidden="true" />}
              >
                {nextStep.action.label}
              </LinkButton>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card as="section">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
              <FileText aria-hidden="true" />
              {t('dashboard.savedApplications')}
            </h2>
            {appDrafts.length === 0 && applications.length === 0 && (
              <p className="text-muted">{t('dashboard.noApplications')}</p>
            )}
            <ul className="flex flex-col gap-2">
              {appDrafts.map((d) => (
                <li
                  key={d.context}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"
                >
                  <span>
                    <Badge tone="warning">{t('applications.draft')}</Badge>
                  </span>
                  <Link
                    className="inline-flex min-h-11 items-center font-semibold text-primary underline"
                    to={`/jobs/${d.context}/apply`}
                  >
                    {t('dashboard.continueApplication')}
                  </Link>
                </li>
              ))}
              {applications.slice(0, 4).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"
                >
                  <Link
                    className="inline-flex min-h-11 items-center font-semibold underline"
                    to={`/applications/${a.id}`}
                  >
                    {a.jobTitle}
                  </Link>
                  <Badge tone={statusTone(a.status)}>{t(`applications.status.${a.status}`)}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card as="section">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
              <Bell aria-hidden="true" />
              {t('dashboard.notifications')}
            </h2>
            {(notes.data ?? []).length === 0 ? (
              <p className="text-muted">{t('dashboard.noNotifications')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(notes.data ?? []).slice(0, 6).map((n) => (
                  <li key={n.id} className="rounded-lg border border-line p-3">
                    <p>
                      {t(`notifications.${n.type}`, {
                        ...n.params,
                        status: n.params.status ? t(`applications.status.${n.params.status}`) : '',
                      })}
                    </p>
                    <p className="text-sm text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

import { Link, useNavigate, useParams } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Loading, PageHeader } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import type { FlowDefinition } from '../../engine/types'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { ApplicationSummary, JobDetail, Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { SharingPreview } from './SharingPreview'

/** Job application on the SAME form engine as registration, prefilled from the reusable profile. */
export default function ApplyPage() {
  const { id } = useParams()
  const t = useT()
  const { me } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const job = useApi<JobDetail>(`/api/v1/jobs/${id}`)
  const form = useApi<FlowDefinition>(`/api/v1/jobs/${id}/application-form`)
  const profile = useApi<Profile>('/api/v1/profile')
  const mine = useApi<ApplicationSummary[]>('/api/v1/applications')

  if (job.loading || form.loading || profile.loading || mine.loading)
    return <Loading label={t('app.loading')} />
  if (job.error || form.error || !job.data || !form.data)
    return (
      <Alert tone="error">{t(`errors.${job.error ?? form.error ?? 'error.unexpected'}`)}</Alert>
    )
  const j = job.data
  const existing = mine.data?.find((a) => a.jobId === j.id)
  const p = profile.data

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t('apply.eyebrow', { org: j.organizationName })}
        title={t('apply.title', { title: j.title })}
        lead={t('apply.lead')}
      />
      {existing ? (
        <Alert
          tone="success"
          title={t('jobs.alreadyApplied')}
          action={
            <Link
              className="font-semibold text-primary underline"
              to={`/applications/${existing.id}`}
            >
              {t('jobs.viewApplication')}
            </Link>
          }
        />
      ) : !j.open ? (
        <Alert tone="warning">{t('jobs.closed')}</Alert>
      ) : (
        <>
          {!p?.completed && (
            <div className="mb-5">
              <Alert
                tone="warning"
                title={t('apply.profileIncompleteTitle')}
                action={
                  <Link className="font-semibold text-primary underline" to="/onboarding">
                    {t('apply.completeProfile')}
                  </Link>
                }
              >
                {t('apply.profileIncomplete')}
              </Alert>
            </div>
          )}
          <FlowRunner
            definition={form.data}
            flowKey="job-application"
            context={j.id}
            draftOwner={me?.id ?? null}
            serverDrafts
            prefill={{
              'account.email': me?.email,
              'account.phone': me?.phone,
              'profile.summary': p?.summary,
            }}
            submitLabel={t('apply.submit')}
            confirmLabel={t('apply.confirmLabel')}
            reviewExtra={(data) => (
              <SharingPreview
                profile={p}
                sections={(data.shareSections as string[] | undefined) ?? []}
                shareAccommodation={data.shareAccommodation === 'yes'}
              />
            )}
            onSubmit={async (data) => {
              const res = await api.post<ApplicationSummary>(
                `/api/v1/jobs/${j.id}/applications`,
                data,
              )
              announce(t('apply.submitted'))
              navigate(`/applications/${res.id}?submitted=1`)
            }}
          />
        </>
      )}
    </div>
  )
}

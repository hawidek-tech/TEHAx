import { Link } from 'react-router'
import { LinkButton } from '../../design-system/Button'
import { Badge, EmptyState, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import type { ApplicationSummary, Draft } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'
import { statusTone } from './status'

export default function ApplicationsPage() {
  const t = useT()
  const apps = useApi<ApplicationSummary[]>('/api/v1/applications')
  const drafts = useApi<Draft[]>('/api/v1/drafts')
  const appDrafts = (drafts.data ?? []).filter((d) => d.flowKey === 'job-application')
  return (
    <>
      <PageHeader
        title={t('applications.title')}
        lead={t('applications.lead')}
        actions={
          <LinkButton to="/saved" variant="secondary">
            {t('jobs.savedTitle')}
          </LinkButton>
        }
      />
      {appDrafts.length > 0 && (
        <section aria-labelledby="drafts-title" className="mb-8">
          <h2 id="drafts-title" className="mb-3 text-xl font-bold">
            {t('applications.draftsTitle')}
          </h2>
          <ul className="flex flex-col gap-3">
            {appDrafts.map((d) => (
              <li
                key={d.context}
                className="af-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span>
                  {t('applications.draftSaved')} <DateText iso={d.updatedAt} />
                </span>
                <LinkButton to={`/jobs/${d.context}/apply`} size="sm">
                  {t('app.continue')}
                </LinkButton>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="submitted-title">
        <h2 id="submitted-title" className="mb-3 text-xl font-bold">
          {t('applications.submittedTitle')}
        </h2>
        <LoadState state={apps}>
          {(list) =>
            list.length === 0 ? (
              <EmptyState
                title={t('applications.empty')}
                action={<LinkButton to="/jobs">{t('dashboard.steps.apply.action')}</LinkButton>}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className="af-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        to={`/applications/${a.id}`}
                        className="text-lg font-bold underline-offset-4 hover:underline"
                      >
                        {a.jobTitle}
                      </Link>
                      <p className="text-muted">
                        {a.organizationName} · {t('applications.reference')}: {a.referenceCode}
                      </p>
                      <p className="text-sm">
                        {t('applications.submittedOn')} <DateText iso={a.submittedAt} />
                      </p>
                    </div>
                    <Badge tone={statusTone(a.status)}>
                      {t(`applications.status.${a.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )
          }
        </LoadState>
      </section>
    </>
  )
}

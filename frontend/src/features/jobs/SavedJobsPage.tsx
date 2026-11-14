import { EmptyState, PageHeader } from '../../design-system/Layout'
import { LinkButton } from '../../design-system/Button'
import { useT } from '../../i18n/useT'
import type { JobSummary } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { LoadState } from '../shared/LoadState'
import { JobCard } from './JobCard'
import { useSaveToggle } from './useSaveToggle'

export default function SavedJobsPage() {
  const t = useT()
  const saved = useApi<JobSummary[]>('/api/v1/saved-jobs')
  const toggle = useSaveToggle(saved.reload)
  return (
    <>
      <PageHeader title={t('jobs.savedTitle')} />
      <LoadState state={saved}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              title={t('jobs.noSaved')}
              action={<LinkButton to="/jobs">{t('nav.jobs')}</LinkButton>}
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {list.map((j) => (
                <li key={j.id}>
                  <JobCard job={j} onToggleSave={toggle} />
                </li>
              ))}
            </ul>
          )
        }
      </LoadState>
    </>
  )
}

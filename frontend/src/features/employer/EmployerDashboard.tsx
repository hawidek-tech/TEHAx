import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { LinkButton } from '../../design-system/Button'
import { Badge, EmptyState, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { useApi } from '../../lib/useApi'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'

interface EmployerJob {
  id: string
  title: string
  status: string
  deadline: string
  applicationCount: number
  accommodations: string[]
}

export default function EmployerDashboard() {
  const t = useT()
  const jobs = useApi<EmployerJob[]>('/api/v1/employer/jobs')
  return (
    <>
      <PageHeader
        eyebrow={t('employer.eyebrow')}
        title={t('employer.title')}
        lead={t('employer.lead')}
        actions={
          <LinkButton to="/employer/jobs/new" icon={<Plus size={18} aria-hidden="true" />}>
            {t('employer.newJob')}
          </LinkButton>
        }
      />
      <LoadState state={jobs}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('employer.noJobs')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">{t('employer.jobsCaption')}</caption>
                <thead>
                  <tr className="border-b-2 border-line">
                    <th scope="col" className="p-3">
                      {t('employer.cols.title')}
                    </th>
                    <th scope="col" className="p-3">
                      {t('employer.cols.status')}
                    </th>
                    <th scope="col" className="p-3">
                      {t('employer.cols.deadline')}
                    </th>
                    <th scope="col" className="p-3">
                      {t('employer.cols.applications')}
                    </th>
                    <th scope="col" className="p-3">
                      {t('employer.cols.accommodations')}
                    </th>
                    <th scope="col" className="p-3">
                      {t('employer.cols.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((j) => (
                    <tr key={j.id} className="border-b border-line align-top">
                      <th scope="row" className="p-3 font-bold">
                        {j.title}
                      </th>
                      <td className="p-3">
                        <Badge tone={j.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                          {t(`employer.status.${j.status}`)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <DateText iso={j.deadline} />
                      </td>
                      <td className="p-3">{j.applicationCount}</td>
                      <td className="p-3">{j.accommodations.length}</td>
                      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the cell holds labelled links */}
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <Link
                            className="inline-flex min-h-11 items-center font-semibold text-primary underline"
                            to={`/employer/jobs/${j.id}/applications`}
                          >
                            {t('employer.viewApplications')}
                            <span className="sr-only">: {j.title}</span>
                          </Link>
                          <Link
                            className="inline-flex min-h-11 items-center font-semibold text-primary underline"
                            to={`/employer/jobs/${j.id}/edit`}
                          >
                            {t('app.edit')}
                            <span className="sr-only">: {j.title}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </LoadState>
    </>
  )
}

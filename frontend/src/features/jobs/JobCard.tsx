import { Bookmark, BookmarkCheck, Clock, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { usePreferences } from '../../a11y/preferences'
import { Button } from '../../design-system/Button'
import { Badge } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import type { JobSummary } from '../../lib/types'
import { DateText } from '../shared/DateText'

export function JobCard({
  job,
  onToggleSave,
}: {
  job: JobSummary
  onToggleSave?: (job: JobSummary) => void
}) {
  const t = useT()
  const { prefs } = usePreferences()
  const headingId = `job-${job.id}`
  return (
    <article
      aria-labelledby={headingId}
      className="af-card af-transition flex flex-col gap-3 p-5 hover:border-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={headingId} className="text-xl font-bold">
            <Link to={`/jobs/${job.id}`} className="underline-offset-4 hover:underline">
              {job.title}
            </Link>
          </h3>
          <p className="font-semibold text-muted">{job.organizationName}</p>
        </div>
        <Badge tone={job.daysLeft <= 7 ? 'warning' : 'neutral'}>
          <Clock size={14} aria-hidden="true" />
          {t('jobs.daysLeft', { count: job.daysLeft })}
        </Badge>
      </div>
      <p>{prefs.simplifiedLanguage ? job.plainSummary : job.summary}</p>
      <ul className="flex flex-wrap gap-2 text-sm">
        <li>
          <Badge>
            <MapPin size={14} aria-hidden="true" />
            {t(`regions.${job.region}`)}
            {job.city ? ` · ${job.city}` : ''}
          </Badge>
        </li>
        <li>
          <Badge>{t(`jobs.workMode.${job.workMode}`)}</Badge>
        </li>
        <li>
          <Badge>{t(`jobs.type.${job.employmentType}`)}</Badge>
        </li>
      </ul>
      {job.accommodations.length > 0 && (
        <div>
          <p className="text-sm font-semibold">{t('jobs.supportOffered')}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {job.accommodations.map((a) => (
              <li key={a}>
                <Badge tone="primary">{t(`accommodations.${a}`)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm">
        {t('jobs.deadline')}: <DateText iso={job.deadline} />
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/jobs/${job.id}`}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline"
        >
          {t('jobs.viewDetails')}
          <span className="sr-only">: {job.title}</span>
        </Link>
        {onToggleSave && (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={job.saved}
            icon={
              job.saved ? (
                <BookmarkCheck size={18} aria-hidden="true" />
              ) : (
                <Bookmark size={18} aria-hidden="true" />
              )
            }
            onClick={() => onToggleSave(job)}
          >
            {job.saved ? t('jobs.saved') : t('jobs.save')}
            <span className="sr-only">: {job.title}</span>
          </Button>
        )}
      </div>
    </article>
  )
}

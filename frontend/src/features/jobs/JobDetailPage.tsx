import { Bookmark, BookmarkCheck, Building2, MessageCircleQuestion, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { usePreferences } from '../../a11y/preferences'
import { ReadAloud } from '../../a11y/ReadAloud'
import { Alert } from '../../design-system/Alert'
import { Button, LinkButton } from '../../design-system/Button'
import { Badge, Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import type { ApplicationSummary, JobDetail } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { AssistantDialog } from '../help/AssistantDialog'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'
import { useSaveToggle } from './useSaveToggle'

const ACC_FIELDS = [
  'workplaceAccommodations',
  'interviewArrangements',
  'flexibleWorking',
  'assistiveTechnology',
  'applicationAccessibility',
] as const

export default function JobDetailPage() {
  const { id } = useParams()
  const t = useT()
  const { prefs } = usePreferences()
  const { me } = useSession()
  const job = useApi<JobDetail>(`/api/v1/jobs/${id}`)
  const mine = useApi<ApplicationSummary[]>(me ? '/api/v1/applications' : null)
  const toggle = useSaveToggle(job.reload)
  const [simple, setSimple] = useState(prefs.simplifiedLanguage)
  const [help, setHelp] = useState(false)

  return (
    <LoadState state={job}>
      {(j) => {
        const existing = mine.data?.find((a) => a.jobId === j.id)
        const acc = j.accommodations
        return (
          <article className="flex flex-col gap-6">
            <PageHeader
              eyebrow={j.organizationName}
              title={j.title}
              lead={
                <span className="flex flex-wrap gap-2">
                  <Badge>
                    {t(`regions.${j.region}`)}
                    {j.city ? ` · ${j.city}` : ''}
                  </Badge>
                  <Badge>{t(`jobs.workMode.${j.workMode}`)}</Badge>
                  <Badge>{t(`jobs.type.${j.employmentType}`)}</Badge>
                  {j.salaryText && <Badge>{j.salaryText}</Badge>}
                </span>
              }
            />
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="flex flex-col gap-6">
                <Card as="section">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-2xl font-bold">
                      {simple ? t('jobs.simpleDescription') : t('jobs.fullDescription')}
                    </h2>
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-pressed={simple}
                      onClick={() => setSimple((s) => !s)}
                    >
                      {simple ? t('jobs.showFull') : t('jobs.showSimple')}
                    </Button>
                  </div>
                  {/* With the voice guide on, the description is read after the title (data-announce). */}
                  <p data-announce className="whitespace-pre-line text-lg">
                    {simple ? j.plainSummary : j.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <ReadAloud text={simple ? j.plainSummary : j.description} />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<MessageCircleQuestion size={18} aria-hidden="true" />}
                      onClick={() => setHelp(true)}
                    >
                      {t('jobs.explain')}
                    </Button>
                  </div>
                </Card>
                <Card as="section">
                  <h2 className="mb-3 text-2xl font-bold">{t('jobs.accommodationsTitle')}</h2>
                  {!acc || (acc.categories.length === 0 && ACC_FIELDS.every((f) => !acc[f])) ? (
                    <p className="text-muted">{t('jobs.noAccommodationInfo')}</p>
                  ) : (
                    <>
                      <ul className="mb-4 flex flex-wrap gap-2">
                        {acc.categories.map((c) => (
                          <li key={c}>
                            <Badge tone="primary">{t(`accommodations.${c}`)}</Badge>
                          </li>
                        ))}
                      </ul>
                      <dl className="flex flex-col gap-4">
                        {ACC_FIELDS.filter((f) => acc[f]).map((f) => (
                          <div key={f}>
                            <dt className="font-bold">{t(`employer.acc.${f}`)}</dt>
                            <dd className="mt-1">{acc[f]}</dd>
                          </div>
                        ))}
                      </dl>
                      {(acc.contactName || acc.contactEmail || acc.contactPhone) && (
                        <div className="mt-4 rounded-xl bg-surface-2 p-4">
                          <p className="font-bold">{t('jobs.accommodationContact')}</p>
                          <p>{acc.contactName}</p>
                          {acc.contactEmail && (
                            <p>
                              <a
                                className="font-semibold text-primary underline"
                                href={`mailto:${acc.contactEmail}`}
                              >
                                {acc.contactEmail}
                              </a>
                            </p>
                          )}
                          {acc.contactPhone && (
                            <p>
                              <a
                                className="font-semibold text-primary underline"
                                href={`tel:${acc.contactPhone}`}
                              >
                                {acc.contactPhone}
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <p className="mt-4 text-sm text-muted">{t('jobs.privateNote')}</p>
                </Card>
              </div>
              <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
                <Card className="flex flex-col gap-3">
                  <p className="text-lg">
                    <span className="font-bold">{t('jobs.deadline')}:</span>{' '}
                    <DateText iso={j.deadline} />
                  </p>
                  <p className="text-muted">{t('jobs.daysLeft', { count: j.daysLeft })}</p>
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
                  ) : j.open ? (
                    <LinkButton
                      // Signed out: create an account first (4 questions), then continue to this application.
                      to={
                        me
                          ? `/jobs/${j.id}/apply`
                          : `/register?next=${encodeURIComponent(`/jobs/${j.id}/apply`)}&reason=apply`
                      }
                      size="lg"
                      icon={<Send size={20} aria-hidden="true" />}
                    >
                      {t('jobs.apply')}
                    </LinkButton>
                  ) : (
                    <Alert tone="warning">{t('jobs.closed')}</Alert>
                  )}
                  <Button
                    variant="secondary"
                    aria-pressed={j.saved}
                    icon={
                      j.saved ? (
                        <BookmarkCheck size={18} aria-hidden="true" />
                      ) : (
                        <Bookmark size={18} aria-hidden="true" />
                      )
                    }
                    onClick={() => toggle({ id: j.id, saved: j.saved, title: j.title })}
                  >
                    {j.saved ? t('jobs.saved') : t('jobs.save')}
                  </Button>
                </Card>
                {j.organizationDescription && (
                  <Card>
                    <h2 className="mb-2 flex items-center gap-2 font-bold">
                      <Building2 size={18} aria-hidden="true" />
                      {t('jobs.aboutEmployer')}
                    </h2>
                    <p>{j.organizationDescription}</p>
                  </Card>
                )}
              </aside>
            </div>
            {help && (
              <AssistantDialog
                open
                onClose={() => setHelp(false)}
                topic="jobs"
                fieldLabel={j.title}
                contextText={j.description}
              />
            )}
          </article>
        )
      }}
    </LoadState>
  )
}

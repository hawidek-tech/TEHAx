import { Download } from 'lucide-react'
import { useId, useState } from 'react'
import { useParams } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { inputClass } from '../../design-system/Field'
import { Badge, Card, EmptyState, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { api, downloadFile } from '../../lib/api'
import type { JobDetail, StatusChange } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { statusTone } from '../applications/status'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'

interface Received {
  id: string
  referenceCode: string
  status: string
  submittedAt: string
  sharedProfile: Record<string, unknown>
  answers: Record<string, unknown>
  accommodationNote?: string
  resumeShared: boolean
  history: StatusChange[]
}

/** Received applications in submission order. ACCESSFLOW never ranks, scores or filters candidates. */
export default function EmployerApplications() {
  const { id } = useParams()
  const t = useT()
  const job = useApi<JobDetail>(`/api/v1/employer/jobs/${id}`)
  const apps = useApi<Received[]>(`/api/v1/employer/jobs/${id}/applications`)
  return (
    <>
      <PageHeader
        eyebrow={t('employer.receivedEyebrow')}
        title={job.data?.title ?? ''}
        lead={t('employer.receivedLead')}
      />
      <div className="mb-6">
        <Alert tone="info">{t('employer.noRanking')}</Alert>
      </div>
      <LoadState state={apps}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('employer.noApplications')} />
          ) : (
            <ul className="flex flex-col gap-6">
              {list.map((a) => (
                <li key={a.id}>
                  <ReceivedCard a={a} job={job.data} onChanged={apps.reload} />
                </li>
              ))}
            </ul>
          )
        }
      </LoadState>
    </>
  )
}

function ReceivedCard({
  a,
  job,
  onChanged,
}: {
  a: Received
  job?: JobDetail
  onChanged: () => void
}) {
  const t = useT()
  const uid = useId()
  const announce = useAnnounce()
  const [status, setStatus] = useState(a.status === 'SUBMITTED' ? 'UNDER_REVIEW' : a.status)
  const [note, setNote] = useState('')
  const p = a.sharedProfile
  const name =
    [p.givenName, p.fatherName, p.grandfatherName].filter(Boolean).join(' ') ||
    t('employer.nameNotShared')
  const question = (k: string) =>
    k.startsWith('custom')
      ? (job?.customQuestions.find((q) => q.id === k)?.label ?? k)
      : t(`flows.job-application.${k}.label`)

  return (
    <Card as="article">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-muted">
            {t('applications.reference')}: {a.referenceCode} · <DateText iso={a.submittedAt} />
          </p>
        </div>
        <Badge tone={statusTone(a.status)}>{t(`applications.status.${a.status}`)}</Badge>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <section aria-label={t('employer.sharedProfile')}>
          <h3 className="mb-2 font-bold">{t('employer.sharedProfile')}</h3>
          <dl className="flex flex-col gap-2">
            {typeof p.region === 'string' && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.region.label')}</dt>
                <dd>
                  {t(`regions.${p.region}`)}
                  {p.city ? `, ${p.city}` : ''}
                </dd>
              </div>
            )}
            {typeof p.headline === 'string' && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.headline.label')}</dt>
                <dd>{p.headline}</dd>
              </div>
            )}
            {typeof p.summary === 'string' && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.summary.label')}</dt>
                <dd>{p.summary}</dd>
              </div>
            )}
            {Array.isArray(p.experience) && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.experience.label')}</dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {(p.experience as Record<string, unknown>[]).map((e, i) => (
                      <li key={i}>
                        {String(e.title)} — {String(e.organization)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {Array.isArray(p.education) && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.education.label')}</dt>
                <dd>
                  <ul className="list-disc pl-5">
                    {(p.education as Record<string, unknown>[]).map((e, i) => (
                      <li key={i}>
                        {t(`flows.profile.education.items.level.options.${e.level}`)} —{' '}
                        {String(e.institution)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {Array.isArray(p.skills) && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.skills.label')}</dt>
                <dd>{(p.skills as string[]).join(', ')}</dd>
              </div>
            )}
            {Array.isArray(p.languages) && (
              <div>
                <dt className="font-semibold text-muted">{t('flows.profile.languages.label')}</dt>
                <dd>
                  {(p.languages as string[])
                    .map((l) => t(`flows.profile.languages.options.${l}`))
                    .join(', ')}
                </dd>
              </div>
            )}
            {Object.keys(p).length === 0 && (
              <p className="text-muted">{t('employer.nothingShared')}</p>
            )}
          </dl>
          {a.resumeShared && (
            <Button
              className="mt-3"
              variant="secondary"
              size="sm"
              icon={<Download size={16} aria-hidden="true" />}
              onClick={() =>
                downloadFile(
                  `/api/v1/employer/applications/${a.id}/resume`,
                  `cv-${a.referenceCode}`,
                )
              }
            >
              {t('employer.downloadResume')}
            </Button>
          )}
        </section>
        <section aria-label={t('applications.answersTitle')}>
          <h3 className="mb-2 font-bold">{t('applications.answersTitle')}</h3>
          <dl className="flex flex-col gap-2">
            {Object.entries(a.answers)
              .filter(([k]) => !k.endsWith('__name'))
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold text-muted">{question(k)}</dt>
                  <dd className="whitespace-pre-line">
                    {k === 'availability'
                      ? t(`flows.job-application.availability.options.${v}`)
                      : String(v)}
                  </dd>
                </div>
              ))}
          </dl>
          {a.accommodationNote && (
            <div className="mt-3 rounded-lg bg-primary-soft p-3">
              <p className="font-bold">{t('employer.accommodationNote')}</p>
              <p>{a.accommodationNote}</p>
            </div>
          )}
        </section>
      </div>
      {a.status !== 'WITHDRAWN' && (
        <form
          className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault()
            await api.post(`/api/v1/employer/applications/${a.id}/status`, {
              status,
              note: note || undefined,
            })
            announce(t('employer.statusUpdated'))
            setNote('')
            onChanged()
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-s`} className="font-semibold">
              {t('employer.updateStatus')}
            </label>
            <select
              id={`${uid}-s`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputClass(false)} min-h-12`}
            >
              {['UNDER_REVIEW', 'INTERVIEW', 'OFFERED', 'NOT_SELECTED'].map((s) => (
                <option key={s} value={s}>
                  {t(`applications.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`${uid}-n`} className="font-semibold">
              {t('employer.noteToApplicant')}{' '}
              <span className="font-normal text-muted">({t('app.optional')})</span>
            </label>
            <input
              id={`${uid}-n`}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputClass(false)} min-h-12`}
            />
          </div>
          <Button type="submit">{t('app.save')}</Button>
        </form>
      )}
    </Card>
  )
}

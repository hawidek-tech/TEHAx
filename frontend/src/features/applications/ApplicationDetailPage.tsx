import { CheckCircle2, Circle, CircleDot, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button, LinkButton } from '../../design-system/Button'
import { Dialog } from '../../design-system/Dialog'
import { Badge, Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import type { ApplicationDetail } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'
import { STAGES, stageOf, statusTone } from './status'

/** Confirmation (after submitting) and accessible status tracking. */
export default function ApplicationDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const t = useT()
  const announce = useAnnounce()
  const app = useApi<ApplicationDetail>(`/api/v1/applications/${id}`)
  const [confirm, setConfirm] = useState<'withdraw' | 'revoke' | null>(null)

  const act = async (kind: 'withdraw' | 'revoke', consentId?: string) => {
    if (kind === 'withdraw') await api.post(`/api/v1/applications/${id}/withdraw`)
    else await api.post(`/api/v1/consents/${consentId}/revoke`)
    setConfirm(null)
    announce(t(kind === 'withdraw' ? 'applications.withdrawn' : 'applications.consentRevoked'))
    app.reload()
  }

  return (
    <LoadState state={app}>
      {(a) => {
        const stage = stageOf(a.summary.status)
        return (
          <div className="flex flex-col gap-6">
            {params.get('submitted') && (
              <section
                data-announce
                aria-labelledby="confirm-title"
                className="rounded-2xl border-2 border-success bg-success-soft p-6"
              >
                <h2 id="confirm-title" className="flex items-center gap-2 text-2xl font-bold">
                  <PartyPopper aria-hidden="true" />
                  {t('apply.successTitle')}
                </h2>
                <p className="mt-2 text-lg">
                  {t('apply.successLead', {
                    title: a.summary.jobTitle,
                    org: a.summary.organizationName,
                  })}
                </p>
                <p className="mt-2 text-lg font-bold">
                  {t('applications.reference')}:{' '}
                  <span className="font-mono">{a.summary.referenceCode}</span>
                </p>
                <h3 className="mt-4 font-bold">{t('apply.whatNextTitle')}</h3>
                <ol className="mt-1 list-decimal pl-6">
                  <li>{t('apply.whatNext1')}</li>
                  <li>{t('apply.whatNext2')}</li>
                  <li>{t('apply.whatNext3')}</li>
                </ol>
                <div className="mt-4 flex flex-wrap gap-3">
                  <LinkButton to="/onboarding">{t('start.done.finishProfile')}</LinkButton>
                  <LinkButton to="/jobs" variant="secondary">
                    {t('start.done.moreJobs')}
                  </LinkButton>
                </div>
              </section>
            )}
            <PageHeader
              eyebrow={a.summary.organizationName}
              title={a.summary.jobTitle ?? ''}
              lead={
                <span>
                  {t('applications.reference')}: {a.summary.referenceCode}
                </span>
              }
              actions={
                <Badge tone={statusTone(a.summary.status)} announce>
                  {t('applications.currentStatus')}: {t(`applications.status.${a.summary.status}`)}
                </Badge>
              }
            />

            <Card as="section">
              <h2 className="mb-4 text-2xl font-bold">{t('applications.trackerTitle')}</h2>
              {a.summary.status === 'WITHDRAWN' ? (
                <Alert tone="warning">{t('applications.withdrawnNote')}</Alert>
              ) : (
                <ol className="grid gap-3 sm:grid-cols-4">
                  {STAGES.map((s, i) => {
                    const state = i < stage ? 'done' : i === stage ? 'current' : 'todo'
                    return (
                      <li
                        key={s}
                        aria-current={state === 'current' ? 'step' : undefined}
                        className={`flex items-start gap-2 rounded-xl border-2 p-3 ${state === 'current' ? 'border-primary bg-primary-soft' : 'border-line'}`}
                      >
                        {state === 'done' ? (
                          <CheckCircle2 aria-hidden="true" className="shrink-0 text-success" />
                        ) : state === 'current' ? (
                          <CircleDot aria-hidden="true" className="shrink-0 text-primary" />
                        ) : (
                          <Circle aria-hidden="true" className="shrink-0 text-muted" />
                        )}
                        <span>
                          <span className="block font-bold">{t(`applications.stages.${s}`)}</span>
                          <span className="text-sm text-muted">
                            {t(`dashboard.state.${state}`)}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
              <h3 className="mb-2 mt-6 text-lg font-bold">{t('applications.historyTitle')}</h3>
              <ol className="flex flex-col gap-2 border-l-4 border-primary pl-4">
                {a.history.map((h, i) => (
                  <li key={i}>
                    <p className="font-semibold">{t(`applications.status.${h.status}`)}</p>
                    <p className="text-sm text-muted">
                      <DateText iso={h.changedAt} />
                    </p>
                    {h.note && <p>{h.note}</p>}
                  </li>
                ))}
              </ol>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card as="section">
                <h2 className="mb-3 text-xl font-bold">{t('applications.answersTitle')}</h2>
                <dl className="flex flex-col gap-3">
                  {Object.entries(a.answers)
                    .filter(([k]) => !k.endsWith('__name'))
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="font-semibold text-muted">
                          {k.startsWith('custom')
                            ? t('applications.employerQuestion')
                            : t(`flows.job-application.${k}.label`)}
                        </dt>
                        <dd className="whitespace-pre-line">
                          {k === 'availability'
                            ? t(`flows.job-application.availability.options.${v}`)
                            : String(v)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </Card>
              <Card as="section">
                <h2 className="mb-3 text-xl font-bold">{t('applications.sharedTitle')}</h2>
                <p className="mb-3 text-muted">{t('applications.sharedLead')}</p>
                {Object.keys(a.sharedProfile).length === 0 ? (
                  <p>{t('applications.nothingShared')}</p>
                ) : (
                  <ul className="list-disc pl-6">
                    {Object.keys(a.sharedProfile).map((k) => (
                      <li key={k}>{t(`applications.sharedField.${k}`)}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 font-semibold">
                  {a.accommodationNote
                    ? t('apply.previewAccommodationShared')
                    : t('apply.previewAccommodationPrivate')}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {a.consentId && (
                    <Button variant="secondary" onClick={() => setConfirm('revoke')}>
                      {t('applications.revokeConsent')}
                    </Button>
                  )}
                  {a.summary.status !== 'WITHDRAWN' && (
                    <Button variant="danger" onClick={() => setConfirm('withdraw')}>
                      {t('applications.withdraw')}
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            <Dialog
              open={confirm !== null}
              title={
                confirm === 'withdraw'
                  ? t('applications.withdrawConfirmTitle')
                  : t('applications.revokeConfirmTitle')
              }
              onClose={() => setConfirm(null)}
              actions={
                <>
                  <Button variant="danger" onClick={() => act(confirm!, a.consentId)}>
                    {t('app.confirm')}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirm(null)}>
                    {t('app.cancel')}
                  </Button>
                </>
              }
            >
              <p>
                {confirm === 'withdraw'
                  ? t('applications.withdrawConfirm')
                  : t('applications.revokeConfirm')}
              </p>
            </Dialog>
          </div>
        )
      }}
    </LoadState>
  )
}

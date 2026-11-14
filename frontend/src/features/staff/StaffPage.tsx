import { FileSearch } from 'lucide-react'
import { useId, useState } from 'react'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { inputClass } from '../../design-system/Field'
import { Badge, Card, EmptyState, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { api, downloadFile } from '../../lib/api'
import type { SupportRequest, Verification } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'

interface Requester {
  displayName: string
  email?: string
  phone?: string
}
interface StaffVerification {
  verification: Verification
  requester?: Requester
  referralCode?: string
}
interface StaffSupport {
  request: SupportRequest
  requester?: Requester
}

/** Authorised support staff only: identity verification decisions and private support requests. */
export default function StaffPage() {
  const t = useT()
  const [tab, setTab] = useState<'identity' | 'support'>('identity')
  return (
    <>
      <PageHeader eyebrow={t('staff.eyebrow')} title={t('staff.title')} lead={t('staff.lead')} />
      <div className="mb-6">
        <Alert tone="warning">{t('staff.privacyReminder')}</Alert>
      </div>
      <div className="mb-6 flex gap-2" role="group" aria-label={t('staff.queues')}>
        <Button
          variant={tab === 'identity' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'identity'}
          onClick={() => setTab('identity')}
        >
          {t('staff.identityQueue')}
        </Button>
        <Button
          variant={tab === 'support' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'support'}
          onClick={() => setTab('support')}
        >
          {t('staff.supportQueue')}
        </Button>
      </div>
      {tab === 'identity' ? <IdentityQueue /> : <SupportQueue />}
    </>
  )
}

function IdentityQueue() {
  const t = useT()
  const list = useApi<StaffVerification[]>('/api/v1/staff/verifications')
  return (
    <LoadState state={list}>
      {(items) =>
        items.length === 0 ? (
          <EmptyState title={t('staff.emptyIdentity')} />
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((i) => (
              <li key={i.verification.id}>
                <VerificationCard item={i} onDone={list.reload} />
              </li>
            ))}
          </ul>
        )
      }
    </LoadState>
  )
}

function VerificationCard({ item, onDone }: { item: StaffVerification; onDone: () => void }) {
  const t = useT()
  const uid = useId()
  const announce = useAnnounce()
  const [note, setNote] = useState('')
  const v = item.verification
  const decide = async (status: string) => {
    await api.post(`/api/v1/staff/verifications/${v.id}/decision`, {
      status,
      note: note || undefined,
    })
    announce(t('staff.decisionSaved'))
    onDone()
  }
  return (
    <Card as="article">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-lg font-bold">{item.requester?.displayName}</h2>
        <Badge tone="warning">{t(`identity.status.${v.status}`)}</Badge>
      </div>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-muted">{t('staff.route')}</dt>
          <dd>{t(`flows.profile.identityRoute.options.${v.route}`)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">{t('staff.submitted')}</dt>
          <dd>
            <DateText iso={v.createdAt} />
          </dd>
        </div>
        {v.documentLabel && (
          <div>
            <dt className="font-semibold text-muted">{t('staff.documentType')}</dt>
            <dd>{v.documentLabel}</dd>
          </div>
        )}
        {v.documentLast4 && (
          <div>
            <dt className="font-semibold text-muted">{t('staff.last4')}</dt>
            <dd>{v.documentLast4}</dd>
          </div>
        )}
        {item.referralCode && (
          <div>
            <dt className="font-semibold text-muted">{t('staff.referralCode')}</dt>
            <dd>{item.referralCode}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold text-muted">{t('staff.contact')}</dt>
          <dd>{item.requester?.email ?? item.requester?.phone}</dd>
        </div>
      </dl>
      {v.documentUploaded && (
        <Button
          className="mt-3"
          variant="secondary"
          size="sm"
          icon={<FileSearch size={16} aria-hidden="true" />}
          onClick={() =>
            downloadFile(`/api/v1/staff/verifications/${v.id}/document`, 'identity-document')
          }
        >
          {t('staff.viewDocument')}
        </Button>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor={`${uid}-note`} className="font-semibold">
          {t('staff.noteToUser')}
        </label>
        <input
          id={`${uid}-note`}
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          className={`${inputClass(false)} min-h-12`}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => decide('VERIFIED')}>{t('staff.verify')}</Button>
          <Button variant="secondary" onClick={() => decide('NEEDS_INFO')}>
            {t('staff.needsInfo')}
          </Button>
          <Button variant="danger" onClick={() => decide('REJECTED')}>
            {t('staff.reject')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function SupportQueue() {
  const t = useT()
  const list = useApi<StaffSupport[]>('/api/v1/staff/support-requests')
  return (
    <LoadState state={list}>
      {(items) =>
        items.length === 0 ? (
          <EmptyState title={t('staff.emptySupport')} />
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((i) => (
              <li key={i.request.id}>
                <SupportCard item={i} onDone={list.reload} />
              </li>
            ))}
          </ul>
        )
      }
    </LoadState>
  )
}

function SupportCard({ item, onDone }: { item: StaffSupport; onDone: () => void }) {
  const t = useT()
  const uid = useId()
  const announce = useAnnounce()
  const r = item.request
  const [status, setStatus] = useState(r.status === 'OPEN' ? 'IN_PROGRESS' : r.status)
  const [response, setResponse] = useState('')
  return (
    <Card as="article">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-lg font-bold">
          {t(`flows.support-request.supportCategory.options.${r.category}`)}
        </h2>
        <Badge tone="warning">{t(`support.status.${r.status}`)}</Badge>
      </div>
      <p className="mt-1 text-muted">
        {item.requester?.displayName} ·{' '}
        {t(`flows.support-request.supportContact.options.${r.preferredContact}`)}:{' '}
        {item.requester?.email ?? item.requester?.phone}
      </p>
      <p className="mt-3 whitespace-pre-line">{r.message}</p>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          await api.post(`/api/v1/staff/support-requests/${r.id}/response`, {
            status,
            response: response || undefined,
          })
          announce(t('staff.responseSent'))
          onDone()
        }}
      >
        <label htmlFor={`${uid}-r`} className="font-semibold">
          {t('staff.reply')}
        </label>
        <textarea
          id={`${uid}-r`}
          rows={3}
          value={response}
          maxLength={2000}
          onChange={(e) => setResponse(e.target.value)}
          className={`${inputClass(false)} py-3`}
        />
        <label htmlFor={`${uid}-s`} className="font-semibold">
          {t('staff.status')}
        </label>
        <select
          id={`${uid}-s`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass(false)} min-h-12`}
        >
          {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
            <option key={s} value={s}>
              {t(`support.status.${s}`)}
            </option>
          ))}
        </select>
        <Button type="submit">{t('staff.send')}</Button>
      </form>
    </Card>
  )
}

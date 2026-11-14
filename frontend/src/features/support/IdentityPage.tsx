import { useMemo, useState } from 'react'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Badge, Card, PageHeader } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { Verification } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { statusTone } from '../applications/status'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'
import { useFlow } from '../shared/useFlow'

/** Alternative identification routes. Every route is reviewed by trained staff; none bypasses verification. */
export default function IdentityPage() {
  const t = useT()
  const { me } = useSession()
  const announce = useAnnounce()
  const list = useApi<Verification[]>('/api/v1/identity')
  const flow = useFlow('profile')
  const [starting, setStarting] = useState(false)
  const def = useMemo(
    () =>
      flow.data && {
        ...flow.data,
        sections: ['identity'],
        steps: flow.data.steps
          .filter((s) => s.section === 'identity')
          .map((s) =>
            s.id === 'identityRoute'
              ? {
                  ...s,
                  fields: s.fields.map((f) => ({
                    ...f,
                    options: f.options?.filter((o) => o.value !== 'LATER'),
                  })),
                }
              : s,
          ),
      },
    [flow.data],
  )

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('identity.title')} lead={t('identity.lead')} />
      <div className="mb-6">
        <Alert tone="info">{t('identity.howItWorks')}</Alert>
      </div>
      <LoadState state={list}>
        {(items) => (
          <>
            {items.length === 0 && !starting && (
              <Card className="mb-6">
                <p className="mb-3">{t('identity.none')}</p>
                <Button onClick={() => setStarting(true)}>{t('identity.start')}</Button>
              </Card>
            )}
            {items.length > 0 && (
              <ul className="mb-6 flex flex-col gap-3">
                {items.map((v) => (
                  <li key={v.id} className="af-card flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">
                        {t(`flows.profile.identityRoute.options.${v.route}`)}
                      </p>
                      <Badge tone={statusTone(v.status)}>{t(`identity.status.${v.status}`)}</Badge>
                    </div>
                    {v.documentLast4 && <p>{t('identity.last4', { last4: v.documentLast4 })}</p>}
                    {v.documentUploaded && <p>{t('identity.documentUploaded')}</p>}
                    {v.reviewerNote && (
                      <p className="rounded-lg bg-surface-2 p-3">
                        <span className="font-bold">{t('identity.staffNote')}:</span>{' '}
                        {v.reviewerNote}
                      </p>
                    )}
                    <p className="text-sm text-muted">
                      <DateText iso={v.createdAt} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 &&
              !starting &&
              items.every((v) => v.status === 'REJECTED' || v.status === 'NEEDS_INFO') && (
                <Button onClick={() => setStarting(true)}>{t('identity.startAgain')}</Button>
              )}
          </>
        )}
      </LoadState>
      {starting && def && (
        <FlowRunner
          definition={def}
          flowKey="profile"
          context="identity"
          draftOwner={me?.id ?? null}
          serverDrafts
          submitLabel={t('identity.submit')}
          onSubmit={async (data) => {
            await api.post('/api/v1/identity', data)
            announce(t('identity.submitted'))
            setStarting(false)
            list.reload()
          }}
        />
      )}
    </div>
  )
}

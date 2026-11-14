import { LifeBuoy, Lock, MessageSquarePlus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Alert } from '../../design-system/Alert'
import { LinkButton } from '../../design-system/Button'
import { Badge, Card, EmptyState, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import type { SupportRequest } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { statusTone } from '../applications/status'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'

/** Private support: no medical proof, private by default, who can see it, and a human route. */
export default function SupportPage() {
  const t = useT()
  const [params] = useSearchParams()
  const requests = useApi<SupportRequest[]>('/api/v1/support-requests')
  return (
    <>
      <PageHeader
        title={t('support.title')}
        lead={t('support.lead')}
        actions={
          <LinkButton to="/support/new" icon={<MessageSquarePlus size={18} aria-hidden="true" />}>
            {t('support.newRequest')}
          </LinkButton>
        }
      />
      {params.get('created') && (
        <div className="mb-6">
          <Alert tone="success" title={t('support.createdTitle')}>
            {t('support.createdBody')}
          </Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="my-requests">
          <h2 id="my-requests" className="mb-3 text-xl font-bold">
            {t('support.myRequests')}
          </h2>
          <LoadState state={requests}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState title={t('support.noRequests')} />
              ) : (
                <ul className="flex flex-col gap-3">
                  {list.map((r) => (
                    <li key={r.id} className="af-card flex flex-col gap-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold">
                          {t(`flows.support-request.supportCategory.options.${r.category}`)}
                        </p>
                        <Badge tone={statusTone(r.status)}>{t(`support.status.${r.status}`)}</Badge>
                      </div>
                      <p className="whitespace-pre-line">{r.message}</p>
                      <p className="text-sm text-muted">
                        <DateText iso={r.createdAt} />
                      </p>
                      {r.staffResponse && (
                        <div className="rounded-lg bg-primary-soft p-3">
                          <p className="font-bold">{t('support.staffReply')}</p>
                          <p>{r.staffResponse}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )
            }
          </LoadState>
        </section>
        <aside className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <Lock size={18} aria-hidden="true" />
              {t('support.whoCanSeeTitle')}
            </h2>
            <p>{t('support.whoCanSee')}</p>
          </Card>
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <LifeBuoy size={18} aria-hidden="true" />
              {t('support.humanTitle')}
            </h2>
            <p>{t('support.humanBody')}</p>
          </Card>
        </aside>
      </div>
    </>
  )
}

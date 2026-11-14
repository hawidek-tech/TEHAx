import { useNavigate } from 'react-router'
import { PageHeader } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import { LoadState } from '../shared/LoadState'
import { useFlow } from '../shared/useFlow'

export default function SupportRequestPage() {
  const t = useT()
  const { me } = useSession()
  const navigate = useNavigate()
  const flow = useFlow('support-request')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('support.newTitle')} lead={t('support.newLead')} />
      <LoadState state={flow}>
        {(def) => (
          <FlowRunner
            definition={def}
            flowKey="support-request"
            draftOwner={me?.id ?? null}
            serverDrafts
            submitLabel={t('support.send')}
            onSubmit={async (data) => {
              await api.post('/api/v1/support-requests', data)
              navigate('/support?created=1')
            }}
          />
        )}
      </LoadState>
    </div>
  )
}

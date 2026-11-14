import { useNavigate } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { PageHeader } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import { LoadState } from '../shared/LoadState'
import { useFlow } from '../shared/useFlow'

/** Guided profile creation: personal details, work, education, identity route and private support. */
export default function ProfileFlowPage() {
  const t = useT()
  const { me } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const flow = useFlow('profile')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t('onboarding.eyebrow')}
        title={t('onboarding.title')}
        lead={t('onboarding.lead')}
      />
      <LoadState state={flow}>
        {(def) => (
          <FlowRunner
            definition={def}
            flowKey="profile"
            draftOwner={me?.id ?? null}
            serverDrafts
            submitLabel={t('onboarding.submit')}
            onSubmit={async (data) => {
              await api.post('/api/v1/onboarding/profile', data)
              announce(t('onboarding.done'))
              navigate('/dashboard?welcome=1')
            }}
          />
        )}
      </LoadState>
    </div>
  )
}

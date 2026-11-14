import { Link, Navigate, useNavigate } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { PageHeader } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import { LoadState } from '../shared/LoadState'
import { useFlow } from '../shared/useFlow'

/** Account registration on the shared form engine: one question per screen, no time limit. */
export default function RegisterPage() {
  const t = useT()
  const { me, register } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const flow = useFlow('registration')
  if (me) return <Navigate to="/dashboard" replace />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={t('auth.registerEyebrow')}
        title={t('auth.registerTitle')}
        lead={
          <>
            {t('auth.registerLead')}{' '}
            <Link to="/privacy" className="font-semibold text-primary underline">
              {t('auth.privacyLink')}
            </Link>
          </>
        }
      />
      <LoadState state={flow}>
        {(def) => (
          <FlowRunner
            definition={def}
            flowKey="registration"
            draftOwner="anon"
            serverDrafts={false}
            submitLabel={t('auth.createAccount')}
            onSubmit={async (d) => {
              await register({
                displayName: d.displayName,
                email: d.contactMethod === 'email' ? d.email : undefined,
                phone: d.contactMethod === 'phone' ? d.phone : undefined,
                password: d.password,
                acceptPrivacyNotice: d.acceptPrivacy === true,
              })
              announce(t('auth.created'))
              navigate('/onboarding')
            }}
          />
        )}
      </LoadState>
      <p className="mt-6 text-center">
        {t('auth.haveAccount')}{' '}
        <Link to="/sign-in" className="font-semibold text-primary underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  )
}

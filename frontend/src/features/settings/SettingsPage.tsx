import { Link } from 'react-router'
import { PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import { PreferencesPanel } from '../shared/PreferencesPanel'

export default function SettingsPage() {
  const t = useT()
  const { me } = useSession()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('prefs.title')} lead={me ? t('prefs.leadSignedIn') : t('prefs.lead')} />
      <PreferencesPanel />
      {me && (
        <p className="mt-6">
          <Link to="/account" className="font-semibold text-primary underline">
            {t('profile.accountLink')}
          </Link>
        </p>
      )}
    </div>
  )
}

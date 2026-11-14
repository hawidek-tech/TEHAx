import { ArrowRight, Lightbulb } from 'lucide-react'
import { ReadAloud } from '../../a11y/ReadAloud'
import { usePreferences } from '../../a11y/preferences'
import { LinkButton } from '../../design-system/Button'
import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import { PreferencesPanel } from '../shared/PreferencesPanel'

/** Accessibility Preview: try every setting before registering; the sample updates live. */
export default function PreviewPage() {
  const t = useT()
  const { me } = useSession()
  const { prefs } = usePreferences()
  return (
    <>
      <PageHeader
        eyebrow={t('prefs.previewEyebrow')}
        title={t('prefs.previewTitle')}
        lead={t('prefs.previewLead')}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <PreferencesPanel />
        <aside aria-labelledby="sample-title" className="lg:sticky lg:top-4 lg:self-start">
          <Card className="flex flex-col gap-4">
            <h2
              id="sample-title"
              className="text-sm font-bold uppercase tracking-wide text-primary"
            >
              {t('prefs.sampleEyebrow')}
            </h2>
            <p className="text-2xl font-bold">{t('prefs.sampleQuestion')}</p>
            <p className="text-muted">{t('prefs.sampleHint')}</p>
            <p className="flex gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <Lightbulb aria-hidden="true" className="shrink-0 text-accent" />
              {t('prefs.sampleExample')}
            </p>
            <ReadAloud text={`${t('prefs.sampleQuestion')}. ${t('prefs.sampleHint')}`} />
            <p className="text-sm text-muted">
              {t('prefs.sampleStatus', { size: prefs.textScale })}
            </p>
          </Card>
          <div className="mt-4 flex flex-col gap-3">
            <LinkButton
              to={me ? '/dashboard' : '/register'}
              size="lg"
              icon={<ArrowRight aria-hidden="true" size={20} />}
            >
              {me ? t('prefs.continueSignedIn') : t('prefs.continueToRegister')}
            </LinkButton>
            <p className="text-sm text-muted">{t('prefs.changeLater')}</p>
          </div>
        </aside>
      </div>
    </>
  )
}

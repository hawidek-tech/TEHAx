import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'

const SECTIONS = [
  'collect',
  'why',
  'share',
  'support',
  'ai',
  'voice',
  'device',
  'rights',
  'security',
] as const

export default function PrivacyPage() {
  const t = useT()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('privacy.title')} lead={t('privacy.lead')} />
      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <Card as="section" key={s}>
            <h2 className="mb-2 text-xl font-bold">{t(`privacy.${s}.title`)}</h2>
            <p>{t(`privacy.${s}.body`)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

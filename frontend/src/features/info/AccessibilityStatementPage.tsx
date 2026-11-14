import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'

/** Honest accessibility statement: target, what is tested, what is not, and how to report problems. */
export default function AccessibilityStatementPage() {
  const t = useT()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('a11yStatement.title')} lead={t('a11yStatement.lead')} />
      <div className="flex flex-col gap-4">
        {(['target', 'tested', 'notTested', 'limitations', 'report'] as const).map((s) => (
          <Card as="section" key={s}>
            <h2 className="mb-2 text-xl font-bold">{t(`a11yStatement.${s}.title`)}</h2>
            <p className="whitespace-pre-line">{t(`a11yStatement.${s}.body`)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

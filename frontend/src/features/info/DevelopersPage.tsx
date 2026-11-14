import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'

const SNIPPET = `<script src="https://YOUR-ACCESSFLOW-HOST/accessflow.js" defer></script>

<accessflow-signup partner-key="pk_your_publishable_key" locale="am"></accessflow-signup>
<accessflow-profile partner-key="pk_your_publishable_key"></accessflow-profile>
<accessflow-job-application partner-key="pk_your_publishable_key" job-id="JOB-UUID"></accessflow-job-application>

<script>
  document.addEventListener('accessflow:completed', (e) => {
    // e.detail = { component, reference } - an opaque reference only, never personal data
  })
</script>`

/** Integration guide for partners (learning platforms and job boards). */
export default function DevelopersPage() {
  const t = useT()
  return (
    <>
      <PageHeader title={t('developers.title')} lead={t('developers.lead')} />
      <div className="flex flex-col gap-6">
        <Card as="section">
          <h2 className="mb-2 text-xl font-bold">{t('developers.level1Title')}</h2>
          <p className="mb-3">{t('developers.level1Body')}</p>
          {/* Scrollable code must be reachable by keyboard to scroll it (WCAG 2.1.1). */}
          <pre
            role="region"
            className="overflow-x-auto rounded-xl bg-ink p-4 text-sm text-bg"
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            aria-label={t('developers.codeLabel')}
            lang="en"
          >
            <code>{SNIPPET}</code>
          </pre>
          <ul className="mt-3 list-disc pl-6">
            <li>{t('developers.point1')}</li>
            <li>{t('developers.point2')}</li>
            <li>{t('developers.point3')}</li>
            <li>{t('developers.point4')}</li>
          </ul>
        </Card>
        <Card as="section">
          <h2 className="mb-2 text-xl font-bold">{t('developers.level2Title')}</h2>
          <p className="mb-3">{t('developers.level2Body')}</p>
          <a
            className="inline-flex min-h-11 items-center font-semibold text-primary underline"
            href="/swagger-ui.html"
          >
            {t('developers.openApi')}
          </a>
        </Card>
        <Card as="section">
          <h2 className="mb-2 text-xl font-bold">{t('developers.level3Title')}</h2>
          <p>{t('developers.level3Body')}</p>
        </Card>
        <Card as="section">
          <h2 className="mb-2 text-xl font-bold">{t('developers.savannaTitle')}</h2>
          <p>{t('developers.savannaBody')}</p>
        </Card>
      </div>
    </>
  )
}

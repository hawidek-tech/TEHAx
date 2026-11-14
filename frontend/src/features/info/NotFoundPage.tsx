import { LinkButton } from '../../design-system/Button'
import { PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'

export default function NotFoundPage() {
  const t = useT()
  return (
    <PageHeader
      title={t('notFound.title')}
      lead={t('notFound.lead')}
      actions={<LinkButton to="/">{t('nav.home')}</LinkButton>}
    />
  )
}

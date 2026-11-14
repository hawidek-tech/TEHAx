import { usePreferences } from '../../a11y/preferences'
import { useT } from '../../i18n/useT'
import { formatDate } from './format'

export function DateText({ iso }: { iso: string }) {
  const { prefs } = usePreferences()
  const t = useT()
  const { gregorian, ethiopian } = formatDate(iso, prefs.locale)
  return (
    <span>
      {gregorian}{' '}
      <span className="text-muted">
        ({t('app.ethiopianCalendar')}: {ethiopian})
      </span>
    </span>
  )
}

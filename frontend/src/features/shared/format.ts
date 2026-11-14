import { formatEthiopian } from '../../lib/ethiopianCalendar'

/** Gregorian date in the user's language, plus the Ethiopian-calendar date for Ethiopian languages. */
export function formatDate(iso: string, locale: string) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  const greg = d.toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return { gregorian: greg, ethiopian: formatEthiopian(d, locale) }
}

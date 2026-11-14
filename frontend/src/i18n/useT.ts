import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePreferences } from '../a11y/preferences'

export type TFn = (key: string, options?: Record<string, unknown>) => string

/**
 * Translation hook that honours the "simplified language" preference: when it is on and a
 * simplified variant exists under "simple.<key>", that variant is used instead.
 */
export function useT(): TFn {
  const { t: rawT, i18n } = useTranslation()
  const t = rawT as unknown as (key: string, options?: Record<string, unknown>) => string
  const { prefs } = usePreferences()
  return useCallback<TFn>(
    (key, options) => {
      // Only use a simplified variant that exists in the CURRENT language (never fall back to English simple text).
      if (
        prefs.simplifiedLanguage &&
        i18n.getResource(i18n.language, 'translation', 'simple.' + key) !== undefined
      ) {
        return t('simple.' + key, options)
      }
      return t(key, options)
    },
    [t, i18n, prefs.simplifiedLanguage],
  )
}

/** Same as useT but returns undefined when the key does not exist (for optional hints/examples). */
export function useOptionalT() {
  const t = useT()
  const { i18n } = useTranslation()
  return useCallback((key: string) => (i18n.exists(key) ? t(key) : undefined), [t, i18n])
}

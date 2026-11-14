import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import type { Locale } from '../lib/types'

export const LOCALES: { code: Locale; nativeName: string; englishName: string }[] = [
  { code: 'am', nativeName: 'አማርኛ', englishName: 'Amharic' },
  { code: 'om', nativeName: 'Afaan Oromoo', englishName: 'Afaan Oromo' },
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'so', nativeName: 'Soomaali', englishName: 'Somali' },
  { code: 'ti', nativeName: 'ትግርኛ', englishName: 'Tigrinya' },
]

/** Locales whose translations have been reviewed by fluent speakers. Update only with evidence. */
export const REVIEWED_LOCALES: Locale[] = ['en']

/** All five supported languages are written left-to-right (Ethiopic and Latin scripts). */
export const directionOf = (_locale: Locale) => 'ltr' as const

// English is bundled; other languages are downloaded only when chosen (smaller first load on slow networks).
const loaders: Record<
  Exclude<Locale, 'en'>,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  am: () => import('./locales/am.json'),
  om: () => import('./locales/om.json'),
  so: () => import('./locales/so.json'),
  ti: () => import('./locales/ti.json'),
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes output
  returnNull: false,
})

export async function loadLocale(locale: Locale) {
  if (locale !== 'en' && !i18n.hasResourceBundle(locale, 'translation')) {
    const mod = await loaders[locale]()
    i18n.addResourceBundle(locale, 'translation', mod.default, true, true)
  }
  await i18n.changeLanguage(locale)
}

export default i18n

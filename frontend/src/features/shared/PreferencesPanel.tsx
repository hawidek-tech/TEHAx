import { useId } from 'react'
import { usePreferences } from '../../a11y/preferences'
import { Card } from '../../design-system/Layout'
import { LOCALES } from '../../i18n'
import { useT } from '../../i18n/useT'
import type { Locale, Preferences } from '../../lib/types'

const TEXT_SIZES = [100, 125, 150, 175, 200]
type Toggle = keyof Pick<
  Preferences,
  | 'highContrast'
  | 'simplifiedLanguage'
  | 'captions'
  | 'keyboardFirst'
  | 'readAloud'
  | 'reducedMotion'
  | 'sharedDevice'
>
const TOGGLES: Toggle[] = [
  'highContrast',
  'simplifiedLanguage',
  'readAloud',
  'captions',
  'keyboardFirst',
  'reducedMotion',
  'sharedDevice',
]

/** Every control here changes the interface immediately (no decorative settings). */
export function PreferencesPanel() {
  const t = useT()
  const { prefs, update } = usePreferences()
  const id = useId()

  return (
    <div className="flex flex-col gap-6">
      <Card as="section">
        <fieldset>
          <legend className="mb-1 text-xl font-bold">{t('prefs.language')}</legend>
          <p className="mb-4 text-muted">{t('prefs.languageHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOCALES.map((l) => (
              <label
                key={l.code}
                className={`af-transition flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 ${prefs.locale === l.code ? 'border-primary bg-primary-soft' : 'border-field hover:border-primary'}`}
              >
                <input
                  type="radio"
                  name={`${id}-lang`}
                  checked={prefs.locale === l.code}
                  onChange={() => update({ locale: l.code as Locale })}
                  className="size-6 accent-[var(--af-primary)]"
                />
                <span className="flex flex-col">
                  <span lang={l.code} className="text-lg font-bold">
                    {l.nativeName}
                  </span>
                  {l.nativeName !== l.englishName && (
                    <span lang="en" className="text-sm text-muted">
                      {l.englishName}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section">
        <fieldset>
          <legend className="mb-1 text-xl font-bold">{t('prefs.textSize')}</legend>
          <p className="mb-4 text-muted">{t('prefs.textSizeHint')}</p>
          <div className="flex flex-wrap gap-3">
            {TEXT_SIZES.map((s) => (
              <label
                key={s}
                className={`af-transition flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 ${prefs.textScale === s ? 'border-primary bg-primary-soft' : 'border-field hover:border-primary'}`}
              >
                <input
                  type="radio"
                  name={`${id}-size`}
                  checked={prefs.textScale === s}
                  onChange={() => update({ textScale: s })}
                  className="size-6 accent-[var(--af-primary)]"
                />
                <span
                  className="font-bold"
                  style={{ fontSize: `${0.8 + (s - 100) / 250}rem` }}
                  aria-hidden="true"
                >
                  A
                </span>
                <span className="font-semibold">{s}%</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card as="section">
        <h2 className="mb-4 text-xl font-bold">{t('prefs.moreTitle')}</h2>
        <ul className="flex flex-col gap-3">
          {TOGGLES.map((k) => (
            <li key={k}>
              <label
                htmlFor={`${id}-${k}`}
                className={`af-transition flex cursor-pointer items-start gap-4 rounded-xl border-2 px-4 py-3 ${prefs[k] ? 'border-primary bg-primary-soft' : 'border-field hover:border-primary'}`}
              >
                <input
                  id={`${id}-${k}`}
                  type="checkbox"
                  role="switch"
                  aria-checked={prefs[k]}
                  checked={prefs[k]}
                  aria-describedby={`${id}-${k}-hint`}
                  onChange={(e) => update({ [k]: e.target.checked } as Partial<Preferences>)}
                  className="mt-1 size-6 shrink-0 accent-[var(--af-primary)]"
                />
                <span className="flex flex-col">
                  <span className="text-lg font-semibold">
                    {t(`prefs.${k}`)}{' '}
                    <span className="text-base font-normal text-muted">
                      — {prefs[k] ? t('prefs.on') : t('prefs.off')}
                    </span>
                  </span>
                  <span id={`${id}-${k}-hint`} className="text-muted">
                    {t(`prefs.${k}Hint`)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-muted">{t('prefs.noDisclosure')}</p>
    </div>
  )
}

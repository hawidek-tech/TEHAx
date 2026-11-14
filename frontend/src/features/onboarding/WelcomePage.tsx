import { ArrowRight, Languages, LogIn, Mic, ShieldCheck, Save } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router'
import { usePreferences } from '../../a11y/preferences'
import { ReadAloud } from '../../a11y/ReadAloud'
import { LinkButton } from '../../design-system/Button'
import { Card } from '../../design-system/Layout'
import { LOCALES } from '../../i18n'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import type { Locale } from '../../lib/types'

export default function WelcomePage() {
  const t = useT()
  const { prefs, update } = usePreferences()
  const { me } = useSession()
  const [params] = useSearchParams()
  if (me)
    return (
      <Navigate
        to={
          me.roles.includes('EMPLOYER')
            ? '/employer'
            : me.roles.includes('SUPPORT_STAFF')
              ? '/staff'
              : '/dashboard'
        }
        replace
      />
    )

  const features = [
    { icon: ArrowRight, key: 'oneQuestion' },
    { icon: Mic, key: 'voice' },
    { icon: ShieldCheck, key: 'privacy' },
    { icon: Save, key: 'save' },
  ]

  return (
    <div className="flex flex-col gap-10">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            {t('welcome.eyebrow')}
          </p>
          <h1
            data-page-heading
            tabIndex={-1}
            className="text-4xl font-extrabold leading-tight sm:text-5xl"
          >
            {t('welcome.title')}
          </h1>
          <p className="max-w-xl text-xl text-muted">{t('welcome.lead')}</p>
          {params.get('partner') && (
            <p className="rounded-xl bg-primary-soft px-4 py-3 font-semibold">
              {t('welcome.partnerNotice')}
            </p>
          )}
          <ReadAloud text={`${t('welcome.title')}. ${t('welcome.lead')}`} />
        </div>
        <Card as="section" className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Languages aria-hidden="true" />
            {t('welcome.chooseLanguage')}
          </h2>
          <p className="text-muted">{t('welcome.languageHint')}</p>
          <fieldset>
            <legend className="sr-only">{t('welcome.chooseLanguage')}</legend>
            <div className="grid gap-2">
              {LOCALES.map((l) => (
                <label
                  key={l.code}
                  className={`af-transition flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 ${prefs.locale === l.code ? 'border-primary bg-primary-soft' : 'border-field hover:border-primary'}`}
                >
                  <input
                    type="radio"
                    name="welcome-lang"
                    checked={prefs.locale === l.code}
                    onChange={() => update({ locale: l.code as Locale })}
                    className="size-6 accent-[var(--af-primary)]"
                  />
                  <span lang={l.code} className="text-lg font-bold">
                    {l.nativeName}
                  </span>
                  {l.nativeName !== l.englishName && (
                    <span lang="en" className="text-muted">
                      {l.englishName}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <LinkButton to="/preview" size="lg" icon={<ArrowRight aria-hidden="true" size={20} />}>
            {t('welcome.start')}
          </LinkButton>
          <LinkButton
            to="/sign-in"
            variant="secondary"
            icon={<LogIn aria-hidden="true" size={20} />}
          >
            {t('welcome.haveAccount')}
          </LinkButton>
        </Card>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="mb-4 text-2xl font-bold">
          {t('welcome.featuresTitle')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, key }) => (
            <li key={key} className="af-card flex flex-col gap-2 p-5">
              <span
                className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                aria-hidden="true"
              >
                <Icon />
              </span>
              <h3 className="text-lg font-bold">{t(`welcome.features.${key}.title`)}</h3>
              <p className="text-muted">{t(`welcome.features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

import { Accessibility, CloudOff, Globe, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { CaptionBar } from '../a11y/ReadAloud'
import { usePreferences } from '../a11y/preferences'
import { useAnnounce } from '../a11y/announcer'
import { speech } from '../a11y/speech'
import { LOCALES } from '../i18n'
import { useT } from '../i18n/useT'
import { useSession } from '../lib/session'
import type { Locale } from '../lib/types'
import { useOnline } from '../lib/useOnline'

/**
 * Application frame: skip link, banner / navigation / main / contentinfo landmarks, language switcher,
 * offline banner, and route-change focus management (focus moves to the new page's h1 and the title is announced).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT()
  const { me, signOut } = useSession()
  const { prefs, update } = usePreferences()
  const online = useOnline()
  const location = useLocation()
  const navigate = useNavigate()
  const announce = useAnnounce()
  // The mobile menu is open only for the page it was opened on, so it closes on navigation.
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuOpen = menuFor === location.pathname
  const langId = useId()

  useEffect(() => {
    speech.stop()
    const timer = window.setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>('[data-page-heading]')
      const title = h1?.textContent?.trim()
      document.title = title ? `${title} · ACCESSFLOW` : 'ACCESSFLOW'
      if (location.key !== 'default') {
        h1?.focus()
        if (title) announce(title)
      }
    }, 50)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.key, announce])

  const isEmployer = me?.roles.includes('EMPLOYER')
  const isStaff = me?.roles.includes('SUPPORT_STAFF')
  const links = me
    ? isEmployer
      ? [
          { to: '/employer', label: t('nav.employer') },
          { to: '/help', label: t('nav.help') },
        ]
      : isStaff
        ? [
            { to: '/staff', label: t('nav.staff') },
            { to: '/help', label: t('nav.help') },
          ]
        : [
            { to: '/dashboard', label: t('nav.dashboard') },
            { to: '/jobs', label: t('nav.jobs') },
            { to: '/applications', label: t('nav.applications') },
            { to: '/profile', label: t('nav.profile') },
            { to: '/support', label: t('nav.support') },
            { to: '/help', label: t('nav.help') },
          ]
    : [
        { to: '/jobs', label: t('nav.jobs') },
        { to: '/help', label: t('nav.help') },
        { to: '/sign-in', label: t('auth.signIn') },
      ]

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `af-transition inline-flex min-h-11 items-center rounded-lg px-3 font-semibold ${isActive ? 'bg-primary-soft text-primary underline underline-offset-4' : 'text-ink hover:bg-surface-2'}`

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className={`${prefs.keyboardFirst ? '' : 'sr-only focus:not-sr-only'} fixed left-3 top-3 z-50 rounded-lg bg-ink px-4 py-3 font-bold text-bg`}
      >
        {t('app.skip')}
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to={me ? (isEmployer ? '/employer' : isStaff ? '/staff' : '/dashboard') : '/'}
            className="flex min-h-11 items-center gap-2 rounded-lg text-xl font-extrabold tracking-tight text-primary"
          >
            <span
              className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-on-primary"
              aria-hidden="true"
            >
              A
            </span>
            ACCESSFLOW
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={langId} className="sr-only">
              {t('prefs.language')}
            </label>
            <span className="flex items-center gap-1">
              <Globe size={18} aria-hidden="true" className="text-muted" />
              <select
                id={langId}
                value={prefs.locale}
                onChange={(e) => update({ locale: e.target.value as Locale })}
                className="min-h-11 rounded-lg border-2 border-field bg-surface px-2 font-semibold text-ink"
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code} lang={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </span>
            <Link
              to="/settings"
              className="af-transition inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-primary px-3 font-semibold text-primary hover:bg-primary-soft"
            >
              <Accessibility size={18} aria-hidden="true" />
              <span>{t('nav.settings')}</span>
            </Link>
            <button
              type="button"
              className="af-transition inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-line px-3 font-semibold md:hidden"
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              onClick={() => setMenuFor(menuOpen ? null : location.pathname)}
            >
              {menuOpen ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <Menu size={18} aria-hidden="true" />
              )}
              {t('app.menu')}
            </button>
          </div>

          <nav
            id="main-nav"
            aria-label={t('nav.label')}
            className={`${menuOpen ? 'flex' : 'hidden'} w-full md:flex md:w-auto`}
          >
            <ul className="flex w-full flex-col gap-1 md:flex-row md:items-center">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className={navLink}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
              {me && (
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut()
                      navigate('/')
                      announce(t('auth.signedOut'))
                    }}
                    className="af-transition inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold hover:bg-surface-2"
                  >
                    <LogOut size={18} aria-hidden="true" />
                    {t('app.signOut')}
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      {!online && (
        <div className="border-b-2 border-warning-ink bg-warning-soft" role="status">
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 font-semibold text-warning-ink">
            <CloudOff size={18} aria-hidden="true" />
            {t('connection.offlineBanner')}
          </p>
        </div>
      )}

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted">{t('app.footer')}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <Link className="inline-flex min-h-11 items-center underline" to="/privacy">
                {t('nav.privacy')}
              </Link>
            </li>
            <li>
              <Link className="inline-flex min-h-11 items-center underline" to="/accessibility">
                {t('nav.accessibility')}
              </Link>
            </li>
            <li>
              <Link className="inline-flex min-h-11 items-center underline" to="/help">
                {t('nav.help')}
              </Link>
            </li>
            <li>
              <Link className="inline-flex min-h-11 items-center underline" to="/developers">
                {t('nav.developers')}
              </Link>
            </li>
          </ul>
        </div>
      </footer>
      <CaptionBar />
    </div>
  )
}

import { CloudOff } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { AccountMenu, HeaderLink, HelpMenu, LanguageSelect, VoiceToggle } from './HelpMenu'
import { CaptionBar } from '../a11y/ReadAloud'
import { usePreferences } from '../a11y/preferences'
import { useAnnounce } from '../a11y/announcer'
import { speech } from '../a11y/speech'
import { useAudioGuide, useRouteAudio } from '../a11y/audioGuide'
import { useT } from '../i18n/useT'
import { useSession } from '../lib/session'
import { useOnline } from '../lib/useOnline'

/**
 * Application frame: skip link, banner / navigation / main / contentinfo landmarks, language switcher,
 * offline banner, and route-change focus management (focus moves to the new page's h1 and the title is announced).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT()
  const { me } = useSession()
  const { prefs } = usePreferences()
  const online = useOnline()
  const location = useLocation()
  const announce = useAnnounce()
  const guide = useAudioGuide()
  useRouteAudio(location.pathname)

  // Connection changes are spoken once by the audio guide (they are always shown in the banner too).
  const wasOnline = useRef(online)
  useEffect(() => {
    if (wasOnline.current === online) return
    wasOnline.current = online
    guide.say(online ? t('connection.backOnlineSpoken') : t('connection.offlineSpoken'))
  }, [online, guide, t])

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
            to={isEmployer ? '/employer' : isStaff ? '/staff' : '/'}
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
            {!me && location.pathname !== '/sign-in' && (
              <HeaderLink to="/sign-in">{t('auth.signIn')}</HeaderLink>
            )}
            <VoiceToggle />
            <LanguageSelect />
            <AccountMenu />
            <HelpMenu />
          </div>
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

      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10 ${guide.active ? 'pb-56' : ''}`}
      >
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
      {!guide.active && <CaptionBar />}
    </div>
  )
}

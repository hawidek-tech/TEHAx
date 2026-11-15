import {
  ChevronDown,
  CircleHelp,
  Home,
  Languages,
  LogOut,
  MessageCircleQuestion,
  Mic,
  Repeat,
  Save,
  Settings,
  UserRound,
  Volume2,
  HeartHandshake,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAnnounce } from '../a11y/announcer'
import { useAudioGuide } from '../a11y/audioGuide'
import { usageModePatch, usePreferences } from '../a11y/preferences'
import { Dialog } from '../design-system/Dialog'
import { LOCALES } from '../i18n'
import { useT } from '../i18n/useT'
import { useSession } from '../lib/session'
import type { Locale } from '../lib/types'

/**
 * The one "Help and settings" button on every screen (docs/ux/first-visit-flow.md, rule R5). It gathers repeat,
 * language, sound and reading, ways to answer, help, a person, save and stop, and all settings.
 */
export function HelpMenu() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const { prefs, update } = usePreferences()
  const { me } = useSession()
  const guide = useAudioGuide()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const langLabel = useId()
  const modeLabel = useId()

  const close = () => setOpen(false)
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const item =
    'af-transition flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-line px-4 text-left font-semibold hover:border-primary hover:bg-primary-soft'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="af-transition inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-primary bg-primary px-4 font-bold text-on-primary hover:bg-primary-strong"
      >
        <CircleHelp size={20} aria-hidden="true" />
        {t('helpMenu.button')}
      </button>
      <Dialog open={open} title={t('helpMenu.title')} onClose={close}>
        <div className="flex flex-col gap-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <button
                type="button"
                className={item}
                onClick={() => {
                  close()
                  // Back on the page: move to its heading (screen readers read it again) and, with the guide on,
                  // say the last message again.
                  window.setTimeout(() => {
                    document.querySelector<HTMLElement>('[data-page-heading]')?.focus()
                    guide.repeat()
                  }, 60)
                }}
              >
                <Repeat aria-hidden="true" size={20} />
                {t('helpMenu.repeat')}
              </button>
            </li>
            <li>
              <button type="button" className={item} onClick={() => go('/')}>
                <Home aria-hidden="true" size={20} />
                {t('helpMenu.home')}
              </button>
            </li>
            <li>
              <button type="button" className={item} onClick={() => go('/help')}>
                <MessageCircleQuestion aria-hidden="true" size={20} />
                {t('helpMenu.askQuestion')}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={item}
                onClick={() =>
                  go(me ? '/support/new' : '/register?next=%2Fsupport%2Fnew&reason=support')
                }
              >
                <HeartHandshake aria-hidden="true" size={20} />
                {t('helpMenu.askPerson')}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={item}
                onClick={() => {
                  go('/')
                  // After the page-title announcement that follows navigation.
                  window.setTimeout(() => announce(t('helpMenu.saved')), 400)
                }}
              >
                <Save aria-hidden="true" size={20} />
                {t('helpMenu.saveStop')}
              </button>
            </li>
            <li>
              <button type="button" className={item} onClick={() => go('/settings')}>
                <Settings aria-hidden="true" size={20} />
                {t('helpMenu.allSettings')}
              </button>
            </li>
          </ul>

          <section aria-labelledby={langLabel} className="flex flex-col gap-2">
            <h3 id={langLabel} className="flex items-center gap-2 text-lg font-bold">
              <Languages aria-hidden="true" size={20} />
              {t('helpMenu.language')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={prefs.locale === l.code}
                  onClick={() => update({ locale: l.code as Locale })}
                  className={`af-transition min-h-11 rounded-lg border-2 px-3 font-semibold ${prefs.locale === l.code ? 'border-primary bg-primary text-on-primary' : 'border-field hover:border-primary'}`}
                >
                  {l.nativeName}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby={modeLabel} className="flex flex-col gap-2">
            <h3 id={modeLabel} className="flex items-center gap-2 text-lg font-bold">
              <Volume2 aria-hidden="true" size={20} />
              {t('helpMenu.sound')}
            </h3>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
              <input
                type="checkbox"
                role="switch"
                checked={guide.active}
                aria-checked={guide.active}
                onChange={(e) =>
                  e.target.checked ? update(usageModePatch('listen')) : guide.deactivate()
                }
                className="size-6 accent-[var(--af-primary)]"
              />
              {t('helpMenu.voiceGuide')}
            </label>
            <p className="text-sm text-muted">{t('helpMenu.voiceGuideHint')}</p>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
              <input
                type="checkbox"
                role="switch"
                checked={prefs.usageMode === 'sign'}
                aria-checked={prefs.usageMode === 'sign'}
                onChange={(e) =>
                  update(
                    e.target.checked
                      ? usageModePatch('sign')
                      : { usageMode: null, captions: false, readAloud: true },
                  )
                }
                className="size-6 accent-[var(--af-primary)]"
              />
              {t('welcome2.pictures')}
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={prefs.simplifiedLanguage}
                onChange={(e) => update({ simplifiedLanguage: e.target.checked })}
                className="size-6 accent-[var(--af-primary)]"
              />
              {t('start.mode.simple')}
            </label>
          </section>

          <section className="flex flex-col gap-1">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Mic aria-hidden="true" size={20} />
              {t('helpMenu.waysTitle')}
            </h3>
            <p>{t('helpMenu.waysBody')}</p>
          </section>
        </div>
      </Dialog>
    </>
  )
}

/** "My account" disclosure menu (signed in). Role-specific links and sign out. */
export function AccountMenu() {
  const t = useT()
  const { me, signOut } = useSession()
  const location = useLocation()
  const [openFor, setOpenFor] = useState<string | null>(null)
  const open = openFor === location.pathname
  const id = useId()
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenFor(null)
    const onClick = (e: MouseEvent) =>
      wrapper.current && !wrapper.current.contains(e.target as Node) && setOpenFor(null)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  if (!me) return null
  const links: { to: string; label: string }[] = me.roles.includes('EMPLOYER')
    ? [{ to: '/employer', label: t('nav.employer') }]
    : me.roles.includes('SUPPORT_STAFF')
      ? [{ to: '/staff', label: t('nav.staff') }]
      : [
          { to: '/', label: t('helpMenu.home') },
          { to: '/applications', label: t('nav.applications') },
          { to: '/profile', label: t('nav.profile') },
          { to: '/jobs', label: t('nav.jobs') },
          { to: '/support', label: t('nav.support') },
          { to: '/dashboard', label: t('nav.dashboard') },
          { to: '/account', label: t('account.title') },
        ]
  const link =
    'af-transition flex min-h-11 w-full items-center rounded-lg px-3 font-semibold hover:bg-surface-2'
  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpenFor(open ? null : location.pathname)}
        className="af-transition inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-primary px-3 font-semibold text-primary hover:bg-primary-soft"
      >
        <UserRound size={18} aria-hidden="true" />
        {t('helpMenu.account')}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <nav
        id={id}
        aria-label={t('helpMenu.account')}
        hidden={!open}
        className="absolute right-0 z-40 mt-2 w-64 rounded-xl border-2 border-line bg-surface p-2 shadow-xl"
      >
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={link} onClick={() => setOpenFor(null)}>
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={link}
              onClick={async () => {
                setOpenFor(null)
                await signOut()
                // A fresh start page: nothing from the signed-in session stays in memory (shared phones), and the
                // signed-in page cannot redirect to "Sign in" first.
                window.location.replace('/')
              }}
            >
              <LogOut size={18} aria-hidden="true" className="mr-2" />
              {t('app.signOut')}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="af-transition inline-flex min-h-11 items-center rounded-lg px-3 font-semibold underline underline-offset-4 hover:bg-surface-2"
    >
      {children}
    </Link>
  )
}

/** Voice guide on/off, on every page (the same switch as "Activate Audio Accessibility"). */
export function VoiceToggle() {
  const t = useT()
  const guide = useAudioGuide()
  const { update } = usePreferences()
  return (
    <button
      type="button"
      aria-pressed={guide.active}
      onClick={() => (guide.active ? guide.deactivate() : update(usageModePatch('listen')))}
      className={`af-transition inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-primary px-3 font-semibold ${guide.active ? 'bg-primary text-on-primary' : 'text-primary hover:bg-primary-soft'}`}
    >
      <Volume2 size={18} aria-hidden="true" />
      {t('helpMenu.voiceGuide')}
    </button>
  )
}

/** Language picker, on every page. */
export function LanguageSelect() {
  const t = useT()
  const id = useId()
  const { prefs, update } = usePreferences()
  return (
    <span className="flex items-center gap-1">
      <label htmlFor={id} className="sr-only">
        {t('helpMenu.language')}
      </label>
      <Languages size={18} aria-hidden="true" className="text-muted" />
      <select
        id={id}
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
  )
}

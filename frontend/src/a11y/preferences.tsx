import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import { storage } from '../lib/storage'
import type { Preferences } from '../lib/types'
import { directionOf, loadLocale } from '../i18n'

export const DEFAULT_PREFERENCES: Preferences = {
  locale: 'en',
  textScale: 100,
  highContrast: false,
  simplifiedLanguage: false,
  captions: false,
  keyboardFirst: false,
  readAloud: true,
  reducedMotion: false,
  sharedDevice: false,
}

interface PreferencesContextValue {
  prefs: Preferences
  update: (patch: Partial<Preferences>) => void
  replace: (prefs: Preferences) => void
  /** Persist to the server for the signed-in user. */
  syncToServer: boolean
  setSyncToServer: (on: boolean) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

/**
 * Applies preferences to the whole document immediately:
 *   text size → --af-text-scale (all rem sizes scale), high contrast → data-contrast,
 *   reduced motion → data-motion, keyboard-first → data-keyboard, language → lang/dir.
 * Simplified language, captions and read-aloud are read by components through usePreferences().
 * Preferences are saved on this device (not sensitive) and, once signed in, to the account.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...storage.get('prefs', {}),
  }))
  const [syncToServer, setSyncToServer] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--af-text-scale', String(prefs.textScale / 100))
    root.dataset.contrast = prefs.highContrast ? 'high' : 'normal'
    root.dataset.motion = prefs.reducedMotion ? 'reduced' : 'normal'
    root.dataset.keyboard = String(prefs.keyboardFirst)
    root.dataset.simplified = String(prefs.simplifiedLanguage)
    root.lang = prefs.locale
    root.dir = directionOf(prefs.locale)
    void loadLocale(prefs.locale)
    storage.set('prefs', prefs)
    if (prefs.sharedDevice) storage.clearDrafts()
  }, [prefs])

  useEffect(() => {
    if (!syncToServer) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      api.put('/api/v1/preferences', prefs).catch(() => undefined) // retried on the next change; local copy is kept
    }, 600)
    return () => window.clearTimeout(saveTimer.current)
  }, [prefs, syncToServer])

  const update = useCallback(
    (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch })),
    [],
  )
  const replace = useCallback((next: Preferences) => setPrefs(next), [])

  const value = useMemo(
    () => ({ prefs, update, replace, syncToServer, setSyncToServer }),
    [prefs, update, replace, syncToServer],
  )
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider')
  return ctx
}

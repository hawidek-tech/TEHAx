import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePreferences } from '../a11y/preferences'
import { NetworkError, api, hasEmbedToken, isEmbedMode, setEmbedToken } from './api'
import { storage } from './storage'
import type { Me, Preferences, SessionResponse } from './types'

interface SessionValue {
  /** undefined while loading, null when signed out */
  me: Me | null | undefined
  refresh: () => Promise<void>
  signIn: (identifier: string, password: string) => Promise<Me>
  register: (payload: Record<string, unknown>) => Promise<Me>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  // Embedded: always start signed out; the token lives only in memory.
  const [me, setMe] = useState<Me | null | undefined>(() =>
    isEmbedMode() && !hasEmbedToken() ? null : undefined,
  )
  const { prefs, replace, setSyncToServer } = usePreferences()

  // Preferences are saved to the account only while someone is signed in.
  const setUser = useCallback(
    (user: Me | null) => {
      setMe(user)
      setSyncToServer(Boolean(user))
    },
    [setSyncToServer],
  )

  const refresh = useCallback(async () => {
    try {
      const user = (await api.get<Me | undefined>('/api/v1/auth/me')) ?? null
      setUser(user)
      cacheMe(user)
    } catch (e) {
      // Offline: keep the last known signed-in user (id, name, roles, language only) so drafts stay reachable.
      setUser(e instanceof NetworkError ? readCachedMe() : null)
    }
  }, [setUser])

  useEffect(() => {
    // Synchronises with the server session on load (an external system); state is set after the response.
    // oxlint-disable-next-line react/set-state-in-effect
    if (!isEmbedMode() || hasEmbedToken()) void refresh()
  }, [refresh])

  const onSession = useCallback(
    (res: SessionResponse) => {
      if (res.embedToken) setEmbedToken(res.embedToken)
      setUser(res.user)
      cacheMe(res.user)
      return res.user
    },
    [setUser],
  )

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const user = onSession(
        await api.post<SessionResponse>('/api/v1/auth/login', { identifier, password }),
      )
      // The account's saved preferences follow the user to any device.
      try {
        replace(await api.get<Preferences>('/api/v1/preferences'))
      } catch {
        /* keep current preferences */
      }
      return user
    },
    [onSession, replace],
  )

  const register = useCallback(
    async (payload: Record<string, unknown>) => {
      const user = onSession(
        await api.post<SessionResponse>('/api/v1/auth/register', {
          ...payload,
          locale: prefs.locale,
        }),
      )
      // Preferences chosen in the Accessibility Preview are saved to the new account.
      await api.put('/api/v1/preferences', prefs).catch(() => undefined)
      return user
    },
    [onSession, prefs],
  )

  const signOut = useCallback(async () => {
    await api.post('/api/v1/auth/logout').catch(() => undefined)
    setEmbedToken(null)
    cacheMe(null)
    storage.clearDrafts()
    setUser(null)
  }, [setUser])

  const value = useMemo(
    () => ({ me, refresh, signIn, register, signOut }),
    [me, refresh, signIn, register, signOut],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

/** Minimal, non-sensitive identity cache (per tab) used only when the network is unavailable. */
function cacheMe(user: Me | null) {
  try {
    if (user)
      window.sessionStorage.setItem(
        'af:me',
        JSON.stringify({
          id: user.id,
          displayName: user.displayName,
          roles: user.roles,
          locale: user.locale,
        }),
      )
    else window.sessionStorage.removeItem('af:me')
  } catch {
    /* ignore */
  }
}
function readCachedMe(): Me | null {
  try {
    const raw = window.sessionStorage.getItem('af:me')
    return raw ? (JSON.parse(raw) as Me) : null
  } catch {
    return null
  }
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

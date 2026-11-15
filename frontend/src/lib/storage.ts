/**
 * Safe wrappers around localStorage. Storage may be unavailable (private mode, blocked storage,
 * some embedded contexts); every call degrades gracefully.
 * NEVER store passwords, identity numbers, support/accommodation details or tokens here (localStorage).
 * (The embed frame keeps its short-lived token in per-tab sessionStorage only - see api.ts.)
 */
const PREFIX = 'af:'

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(PREFIX + key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* storage unavailable or full */
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(PREFIX + key)
    } catch {
      /* ignore */
    }
  },
  /** Removes all ACCESSFLOW drafts (on sign-out, or when the user marks the device as shared). */
  clearDrafts() {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(PREFIX + 'draft:'))
        .forEach((k) => window.localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  },
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type Politeness = 'polite' | 'assertive'

const AnnouncerContext = createContext<(message: string, politeness?: Politeness) => void>(
  () => undefined,
)

/**
 * One pair of live regions for the whole app. Components call announce() instead of creating their own
 * live regions, which avoids duplicate or competing announcements for screen-reader users.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite
    set('')
    window.clearTimeout(timer.current)
    // Clearing first and re-setting on the next tick makes repeated identical messages be announced again.
    timer.current = window.setTimeout(() => set(message), 60)
  }, [])

  const value = useMemo(() => announce, [announce])
  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="announcer-polite"
      >
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  )
}

export const useAnnounce = () => useContext(AnnouncerContext)

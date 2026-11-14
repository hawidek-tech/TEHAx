import { useEffect, useState } from 'react'
import { getSystemInfo, type SystemInfo } from '../lib/api'

type State = { kind: 'checking' } | { kind: 'online'; info: SystemInfo } | { kind: 'offline' }

/**
 * Shows whether the ACCESSFLOW service can be reached.
 * Uses role="status" (polite live region) so screen readers hear changes without interruption.
 */
export function ConnectionStatus() {
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    const controller = new AbortController()
    getSystemInfo(controller.signal)
      .then((info) => setState({ kind: 'online', info }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'offline' })
      })
    return () => controller.abort()
  }, [])

  const message =
    state.kind === 'checking'
      ? 'Checking connection to the service…'
      : state.kind === 'online'
        ? `Connected to ${state.info.name} service (API ${state.info.apiVersion}, version ${state.info.version}).`
        : 'Cannot reach the service right now. Check your connection and try again later.'

  return (
    <p role="status" className="rounded-md border-2 border-current p-4">
      {message}
    </p>
  )
}

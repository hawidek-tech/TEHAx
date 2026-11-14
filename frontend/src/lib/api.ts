/** Minimal API client. Phase 1 adds CSRF handling and RFC 7807 error parsing. */
export interface SystemInfo {
  name: string
  version: string
  apiVersion: string
}

const DEFAULT_TIMEOUT_MS = 15_000 // Generous: slow 3G connections are expected.

export async function getSystemInfo(signal?: AbortSignal): Promise<SystemInfo> {
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  const response = await fetch('/api/v1/system/info', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return (await response.json()) as SystemInfo
}

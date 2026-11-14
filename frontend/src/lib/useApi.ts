import { useCallback, useEffect, useState } from 'react'
import { ApiError, NetworkError, api } from './api'

export interface ApiState<T> {
  data: T | undefined
  error: string | null
  loading: boolean
  reload: () => void
}

interface Result<T> {
  key: string
  data: T | undefined
  error: string | null
}

/** GET with loading and translatable error state. `url = null` skips the request. */
export function useApi<T>(url: string | null): ApiState<T> {
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)
  const key = url ? `${url}#${tick}` : ''

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    api
      .get<T>(url, controller.signal)
      .then((d) => setResult({ key, data: d, error: null }))
      .catch((e) => {
        if (controller.signal.aborted) return
        const code =
          e instanceof NetworkError
            ? 'error.network'
            : e instanceof ApiError
              ? e.code
              : 'error.unexpected'
        setResult((prev) => ({ key, data: prev?.data, error: code }))
      })
    return () => controller.abort()
  }, [url, key])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const current = result && url && result.key === key
  return {
    // Keep showing the previous data while reloading, so screens do not flash.
    data: url ? result?.data : undefined,
    error: current ? result.error : null,
    loading: Boolean(url) && !current,
    reload,
  }
}

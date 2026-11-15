/**
 * API client.
 * - First-party: session cookie + CSRF header (X-XSRF-TOKEN read from the XSRF-TOKEN cookie).
 * - Embedded (iframe): bearer token kept ONLY in memory. No cookies are needed, so it works when
 *   third-party cookies are blocked.
 * Errors are thrown as ApiError with a translatable `code` and optional field errors.
 */
export interface FieldError {
  field: string
  code: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]
  readonly retryAfterSeconds?: number

  constructor(
    status: number,
    code: string,
    fieldErrors: FieldError[] = [],
    retryAfterSeconds?: number,
  ) {
    super(code)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/** Thrown when the request could not reach the server (offline, timeout, DNS…). */
export class NetworkError extends Error {
  constructor() {
    super('network')
  }
}

const TIMEOUT_MS = 25_000 // Generous: slow 3G connections are expected.

const embed: { key: string | null; token: string | null } = { key: null, token: null }

const TOKEN_KEY = 'af:embedToken'

/** Embedded mode. The key may be '' at first (keyless <db-signup>) and set once the partner is resolved by origin. */
export function setEmbedMode(publishableKey: string | null) {
  embed.key = publishableKey
  if (publishableKey !== null && embed.token === null) {
    try {
      // Per-tab sessionStorage of the ACCESSFLOW frame: browsers partition it by the host site, the host page cannot
      // read it, and it is NOT a cookie - so sign-in survives moving between pages of the same partner site.
      embed.token = window.sessionStorage.getItem(TOKEN_KEY)
    } catch {
      /* storage blocked: token stays in memory only */
    }
  }
}
export function setEmbedToken(token: string | null) {
  embed.token = token
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
    else window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
export function hasEmbedToken() {
  return embed.token !== null
}
export function isEmbedMode() {
  return embed.key !== null
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

async function ensureCsrf(): Promise<string | null> {
  let token = readCookie('XSRF-TOKEN')
  if (!token) {
    await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' }).catch(() => undefined)
    token = readCookie('XSRF-TOKEN')
  }
  return token
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export async function request<T>(
  method: Method,
  url: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (embed.key !== null) {
    // Embedded: never cookies. Partner header once known; bearer token whenever the frame has one.
    if (embed.key) headers['X-AccessFlow-Embed'] = embed.key
    if (embed.token) headers['Authorization'] = `Bearer ${embed.token}`
  } else if (method !== 'GET') {
    const csrf = await ensureCsrf()
    if (csrf) headers['X-XSRF-TOKEN'] = csrf
  }
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload,
      credentials: embed.key !== null ? 'omit' : 'same-origin',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new NetworkError()
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const data = text ? safeJson(text) : undefined
  if (!response.ok) {
    const problem = (data ?? {}) as {
      code?: string
      fieldErrors?: FieldError[]
      retryAfterSeconds?: number
    }
    throw new ApiError(
      response.status,
      problem.code ?? 'error.unexpected',
      problem.fieldErrors ?? [],
      problem.retryAfterSeconds,
    )
  }
  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const api = {
  get: <T>(url: string, signal?: AbortSignal) => request<T>('GET', url, undefined, signal),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
}

/** Downloads an authenticated file (attachment) without exposing tokens in URLs. */
export async function downloadFile(url: string, fallbackName: string) {
  const headers: Record<string, string> = {}
  if (embed.token) headers['Authorization'] = `Bearer ${embed.token}`
  const res = await fetch(url, {
    headers,
    credentials: embed.key !== null ? 'omit' : 'same-origin',
  })
  if (!res.ok) throw new ApiError(res.status, 'error.notFound')
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

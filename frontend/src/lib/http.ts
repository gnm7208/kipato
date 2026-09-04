import type { ApiErrorPayload } from '../types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

let unauthorizedHandler: (() => void) | null = null

/** The request never reached the server: no signal, DNS failure, server down. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export async function request<T>(path: string, options: RequestInit & { json?: unknown } = {}) {
  const { json, ...init } = options
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      body: json === undefined ? init.body : JSON.stringify(json),
    })
  } catch {
    // fetch only rejects when the request never made it, which is exactly the
    // case the offline layer needs to tell apart from an HTTP error.
    throw new NetworkError()
  }

  const responseText = await response.text()
  let payload: unknown = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown
    } catch {
      payload = responseText
    }
  }

  if (response.status === 401) {
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    const errorPayload = (typeof payload === 'object' && payload !== null
      ? payload
      : {}) as ApiErrorPayload
    const message = errorPayload.message ?? errorPayload.error ?? 'Something went wrong'
    throw new ApiError(message, response.status, errorPayload.error)
  }

  return payload as T
}

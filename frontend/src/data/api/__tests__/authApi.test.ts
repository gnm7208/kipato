import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '../authApi'
import { ApiError } from '../../../lib/http'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('authApi.deleteAccount', () => {
  it('sends the password with a DELETE to /api/auth/me', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ message: 'Account deleted' }))

    const result = await authApi.deleteAccount('securepassword123')

    expect(result.message).toBe('Account deleted')
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/auth/me')
    expect(init?.method).toBe('DELETE')
    expect(JSON.parse(String(init?.body))).toEqual({ password: 'securepassword123' })
  })

  it('surfaces a wrong password as a 403 ApiError so the page can say so', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ error: 'Incorrect password' }, 403))

    const failure = await authApi.deleteAccount('nope').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 403 })
  })
})

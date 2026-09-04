import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { repository } from '../../data/repository'
import { ApiError, NetworkError, setUnauthorizedHandler } from '../../lib/http'
import { clearOfflineData, readCache, writeCache } from '../../lib/offline-store'
import { refreshPendingCount, startSyncEngine } from '../../lib/sync-engine'
import type { LoginPayload, RegisterPayload, User } from '../../types'

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated' | 'submitting'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_CACHE_KEY = 'auth:user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('booting')

  const clearAuth = useCallback(() => {
    setUser(null)
    setStatus('unauthenticated')
    void queryClient.cancelQueries()
    void queryClient.removeQueries()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(clearAuth)
    return () => setUnauthorizedHandler(null)
  }, [clearAuth])

  useEffect(() => {
    let active = true
    repository.auth.me()
      .then(({ user: currentUser }) => {
        if (!active) return
        setUser(currentUser)
        setStatus('authenticated')
        void writeCache(USER_CACHE_KEY, currentUser)
      })
      .catch(async (error: unknown) => {
        if (!active) return

        // Opening the app with no signal must not look like being signed out:
        // the session cookie is still good, and every write is queued anyway.
        if (error instanceof NetworkError) {
          const cached = await readCache<User>(USER_CACHE_KEY)
          if (active && cached) {
            setUser(cached)
            setStatus('authenticated')
            return
          }
        }

        if (!active) return
        setUser(null)
        setStatus('unauthenticated')
        if (error instanceof ApiError && error.status === 401) {
          void clearOfflineData()
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    void refreshPendingCount()
    return startSyncEngine(() => {
      // Entries reached the server, so cached views are now stale.
      void queryClient.invalidateQueries()
    })
  }, [queryClient, status])

  const login = useCallback(async (payload: LoginPayload) => {
    setStatus('submitting')
    const response = await repository.auth.login(payload)
    setUser(response.user)
    setStatus('authenticated')
    await writeCache(USER_CACHE_KEY, response.user)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    setStatus('submitting')
    const response = await repository.auth.register(payload)
    setUser(response.user)
    setStatus('authenticated')
    await writeCache(USER_CACHE_KEY, response.user)
  }, [])

  const logout = useCallback(async () => {
    setStatus('submitting')
    try {
      await repository.auth.logout()
    } finally {
      // Phones get shared. Never leave one worker's cached record behind for
      // the next person to sign in.
      await clearOfflineData()
      clearAuth()
    }
  }, [clearAuth])

  const value = useMemo(() => ({ user, status, login, register, logout }), [login, logout, register, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

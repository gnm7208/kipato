import { request } from '../../lib/http'
import type { AuthResponse, LoginPayload, MessageResponse, RegisterPayload, User } from '../../types'

export const authApi = {
  async register(payload: RegisterPayload) {
    return request<AuthResponse>('/api/auth/register', { method: 'POST', json: payload })
  },
  async login(payload: LoginPayload) {
    return request<AuthResponse>('/api/auth/login', { method: 'POST', json: payload })
  },
  async logout() {
    return request<MessageResponse>('/api/auth/logout', { method: 'POST' })
  },
  async me() {
    return request<{ user: User }>('/api/auth/me')
  },
}

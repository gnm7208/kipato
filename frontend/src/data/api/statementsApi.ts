import { request } from '../../lib/http'
import type {
  ShareResponse,
  SharedStatement,
  Statement,
  StatementDetail,
  StatementPayload,
} from '../../types'

export const statementsApi = {
  async listStatements() {
    return request<{ statements: Statement[] }>('/api/statements/')
  },
  async createStatement(payload: StatementPayload) {
    return request<Statement>('/api/statements/', { method: 'POST', json: payload })
  },
  async getStatement(id: number) {
    return request<StatementDetail>(`/api/statements/${id}`)
  },
  async shareStatement(id: number, expiresInDays = 30) {
    return request<ShareResponse>(`/api/statements/${id}/share`, {
      method: 'POST',
      json: { expires_in_days: expiresInDays },
    })
  },
  async revokeShare(id: number) {
    return request<{ message: string; statement: Statement }>(`/api/statements/${id}/share`, {
      method: 'DELETE',
    })
  },
}

/** Public: no session, so this never goes through the authenticated repository. */
export async function fetchSharedStatement(token: string) {
  return request<SharedStatement>(`/api/statements/shared/${encodeURIComponent(token)}`)
}

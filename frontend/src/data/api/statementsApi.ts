import { request } from '../../lib/http'
import type { Statement, StatementDetail, StatementPayload } from '../../types'

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
}

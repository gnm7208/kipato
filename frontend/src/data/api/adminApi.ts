import { request } from '../../lib/http'
import type {
  AdminStats,
  AdminWorker,
  AdminWorkerQueryParams,
  AdminWorkersResponse,
  EntriesResponse,
  EntryQueryParams,
  Statement,
} from '../../types'

export const adminApi = {
  async getStats() {
    return request<AdminStats>('/api/admin/stats')
  },

  async listWorkers(params: AdminWorkerQueryParams = {}) {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    if (params.perPage) query.set('per_page', String(params.perPage))
    const queryString = query.toString()
    return request<AdminWorkersResponse>(`/api/admin/workers${queryString ? `?${queryString}` : ''}`)
  },

  async getWorker(id: number) {
    return request<{ worker: AdminWorker }>(`/api/admin/workers/${id}`)
  },

  async listWorkerEntries(id: number, params: EntryQueryParams = {}) {
    const query = new URLSearchParams()
    if (params.startDate) query.set('start_date', params.startDate)
    if (params.endDate) query.set('end_date', params.endDate)
    if (params.page) query.set('page', String(params.page))
    if (params.perPage) query.set('per_page', String(params.perPage))
    const queryString = query.toString()
    return request<EntriesResponse>(
      `/api/admin/workers/${id}/entries${queryString ? `?${queryString}` : ''}`,
    )
  },

  async listWorkerStatements(id: number) {
    return request<{ statements: Statement[] }>(`/api/admin/workers/${id}/statements`)
  },
}

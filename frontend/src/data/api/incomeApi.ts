import { NetworkError, request } from '../../lib/http'
import {
  listQueuedEntries,
  newClientUuid,
  queueEntry,
  readCache,
  removeQueuedEntry,
  writeCache,
} from '../../lib/offline-store'
import { refreshPendingCount } from '../../lib/sync-engine'
import type {
  EntriesResponse,
  EntryQueryParams,
  IncomeEntry,
  IncomeEntryPayload,
  OutboxEntry,
  TrendsResponse,
} from '../../types'

const ENTRIES_CACHE_PREFIX = 'income:entries'
const TRENDS_CACHE_KEY = 'income:trends'

function buildQuery(params: EntryQueryParams) {
  const query = new URLSearchParams()
  if (params.startDate) query.set('start_date', params.startDate)
  if (params.endDate) query.set('end_date', params.endDate)
  if (params.page) query.set('page', String(params.page))
  if (params.perPage) query.set('per_page', String(params.perPage))
  return query.toString()
}

/** A queued entry rendered as the entry the worker will eventually have. */
export function queuedEntryToIncomeEntry(queued: OutboxEntry): IncomeEntry {
  return {
    // Negative ids never collide with server ids, and mark a row as not-yet-real.
    id: -Math.abs(hashUuid(queued.client_uuid)),
    worker_id: 0,
    amount: queued.payload.amount,
    date: queued.payload.date,
    method: queued.payload.method,
    note: queued.payload.note ?? null,
    sync_status: queued.attempts > 0 && queued.last_error ? 'failed' : 'pending',
    synced_at: null,
    created_at: queued.queued_at,
    client_uuid: queued.client_uuid,
  }
}

function hashUuid(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return hash === 0 ? 1 : hash
}

function withinRange(entry: IncomeEntry, params: EntryQueryParams) {
  if (params.startDate && entry.date < params.startDate) return false
  if (params.endDate && entry.date > params.endDate) return false
  return true
}

/**
 * Queued entries belong at the top of the first page: to the worker they are
 * already logged, they just have not reached the server yet.
 */
async function mergeQueued(
  response: EntriesResponse,
  params: EntryQueryParams,
): Promise<EntriesResponse> {
  const queued = await listQueuedEntries()
  if (queued.length === 0) return response

  const pending = queued
    .map(queuedEntryToIncomeEntry)
    .filter((entry) => withinRange(entry, params))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (pending.length === 0) return response

  const onFirstPage = (response.page ?? 1) <= 1
  return {
    ...response,
    entries: onFirstPage ? [...pending, ...response.entries] : response.entries,
    total: response.total + pending.length,
  }
}

async function mergeQueuedTrends(trends: TrendsResponse): Promise<TrendsResponse> {
  const queued = await listQueuedEntries()
  if (queued.length === 0) return trends

  const daily = { ...trends.daily_breakdown }
  let total = trends.total_income
  for (const item of queued) {
    daily[item.payload.date] = (daily[item.payload.date] ?? 0) + item.payload.amount
    total += item.payload.amount
  }

  const count = trends.entry_count + queued.length
  return {
    total_income: total,
    entry_count: count,
    average_daily: count > 0 ? total / Object.keys(daily).length : 0,
    daily_breakdown: daily,
  }
}

export const incomeApi = {
  async listEntries(params: EntryQueryParams = {}) {
    const queryString = buildQuery(params)
    const path = `/api/income/entries${queryString ? `?${queryString}` : ''}`
    const cacheKey = `${ENTRIES_CACHE_PREFIX}:${queryString}`

    try {
      const response = await request<EntriesResponse>(path)
      await writeCache(cacheKey, response)
      return mergeQueued(response, params)
    } catch (error: unknown) {
      if (error instanceof NetworkError) {
        const cached = await readCache<EntriesResponse>(cacheKey)
        if (cached) return mergeQueued(cached, params)
      }
      throw error
    }
  },

  async createEntry(payload: IncomeEntryPayload) {
    const clientUuid = payload.client_uuid ?? newClientUuid()
    const body = { ...payload, client_uuid: clientUuid }

    try {
      return await request<IncomeEntry>('/api/income/entries', { method: 'POST', json: body })
    } catch (error: unknown) {
      if (error instanceof NetworkError) {
        // No signal: keep the entry and hand back what the worker just logged,
        // so the record looks right immediately. The sync engine sends it later.
        const queued = await queueEntry(payload, clientUuid)
        // Let the offline banner show the new count straight away.
        void refreshPendingCount()
        return queuedEntryToIncomeEntry(queued)
      }
      throw error
    }
  },

  async getEntry(id: number) {
    return request<IncomeEntry>(`/api/income/entries/${id}`)
  },

  async updateEntry(id: number, payload: Partial<IncomeEntryPayload>) {
    return request<IncomeEntry>(`/api/income/entries/${id}`, { method: 'PATCH', json: payload })
  },

  async deleteEntry(id: number) {
    if (id < 0) {
      // Still in the outbox, so it can simply be dropped before it ever syncs.
      const queued = await listQueuedEntries()
      const match = queued.find((item) => queuedEntryToIncomeEntry(item).id === id)
      if (match) {
        await removeQueuedEntry(match.client_uuid)
        void refreshPendingCount()
        return { message: 'Queued entry discarded' }
      }
    }
    return request<{ message: string }>(`/api/income/entries/${id}`, { method: 'DELETE' })
  },

  async getTrends() {
    try {
      const response = await request<TrendsResponse>('/api/income/trends')
      await writeCache(TRENDS_CACHE_KEY, response)
      return mergeQueuedTrends(response)
    } catch (error: unknown) {
      if (error instanceof NetworkError) {
        const cached = await readCache<TrendsResponse>(TRENDS_CACHE_KEY)
        if (cached) return mergeQueuedTrends(cached)
      }
      throw error
    }
  },
}

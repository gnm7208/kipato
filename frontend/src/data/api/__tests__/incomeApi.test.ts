import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { incomeApi } from '../incomeApi'
import {
  countQueuedEntries,
  listQueuedEntries,
  useMemoryBackendForTests,
} from '../../../lib/offline-store'
import type { EntriesResponse } from '../../../types'

const serverEntry = {
  id: 7,
  worker_id: 1,
  amount: 500,
  date: '2026-09-03',
  method: 'cash' as const,
  note: 'From the server',
  sync_status: 'synced' as const,
  synced_at: '2026-09-03T10:00:00',
  created_at: '2026-09-03T10:00:00',
}

const serverPage: EntriesResponse = {
  entries: [serverEntry],
  total: 1,
  page: 1,
  per_page: 20,
  pages: 1,
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
  } as Response
}

/** What fetch does when the phone has no signal. */
function networkFailure() {
  return Promise.reject(new TypeError('Failed to fetch'))
}

describe('incomeApi offline behaviour', () => {
  let sentBodies: string[] = []

  beforeEach(() => {
    useMemoryBackendForTests()
    sentBodies = []
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queues an entry when the request cannot reach the server', async () => {
    vi.stubGlobal('fetch', vi.fn(networkFailure))

    const entry = await incomeApi.createEntry({ amount: 750, date: '2026-09-04', method: 'cash' })

    expect(entry.sync_status).toBe('pending')
    expect(entry.id).toBeLessThan(0)
    expect(await countQueuedEntries()).toBe(1)

    const [queued] = await listQueuedEntries()
    expect(queued.payload.amount).toBe(750)
    expect(queued.payload.client_uuid).toBe(entry.client_uuid)
  })

  it('does not queue when the server answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'amount is required' }, 400)))

    await expect(
      incomeApi.createEntry({ amount: 0, date: '2026-09-04', method: 'cash' }),
    ).rejects.toThrow('amount is required')
    expect(await countQueuedEntries()).toBe(0)
  })

  it('sends a client_uuid so a replay cannot duplicate the entry', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      sentBodies.push(String(init?.body))
      return jsonResponse(serverEntry, 201)
    })
    vi.stubGlobal('fetch', fetchMock)

    await incomeApi.createEntry({ amount: 500, date: '2026-09-03', method: 'cash' })

    expect(JSON.parse(sentBodies[0]).client_uuid).toEqual(expect.any(String))
  })

  it('shows queued entries at the top of the list, above server entries', async () => {
    vi.stubGlobal('fetch', vi.fn(networkFailure))
    await incomeApi.createEntry({ amount: 900, date: '2026-09-04', method: 'cash' })

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(serverPage)))
    const page = await incomeApi.listEntries()

    expect(page.entries).toHaveLength(2)
    expect(page.entries[0].sync_status).toBe('pending')
    expect(page.entries[0].amount).toBe(900)
    expect(page.entries[1].id).toBe(7)
    expect(page.total).toBe(2)
  })

  it('serves the last cached page when the network is gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(serverPage)))
    await incomeApi.listEntries()

    vi.stubGlobal('fetch', vi.fn(networkFailure))
    const page = await incomeApi.listEntries()

    expect(page.entries[0].id).toBe(7)
  })

  it('fails loudly when offline with nothing cached', async () => {
    vi.stubGlobal('fetch', vi.fn(networkFailure))

    await expect(incomeApi.listEntries()).rejects.toThrow()
  })

  it('folds queued entries into the trends totals', async () => {
    vi.stubGlobal('fetch', vi.fn(networkFailure))
    await incomeApi.createEntry({ amount: 250, date: '2026-09-04', method: 'cash' })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          total_income: 1000,
          entry_count: 2,
          average_daily: 500,
          daily_breakdown: { '2026-09-03': 1000 },
        }),
      ),
    )
    const trends = await incomeApi.getTrends()

    expect(trends.total_income).toBe(1250)
    expect(trends.entry_count).toBe(3)
    expect(trends.daily_breakdown['2026-09-04']).toBe(250)
  })

  it('discards a queued entry locally instead of calling the server', async () => {
    vi.stubGlobal('fetch', vi.fn(networkFailure))
    const entry = await incomeApi.createEntry({ amount: 100, date: '2026-09-04', method: 'cash' })

    const fetchMock = vi.fn(networkFailure)
    vi.stubGlobal('fetch', fetchMock)
    await incomeApi.deleteEntry(entry.id)

    expect(await countQueuedEntries()).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

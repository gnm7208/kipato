import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queueEntry, listQueuedEntries, useMemoryBackendForTests } from '../offline-store'
import { getSyncState, syncNow } from '../sync-engine'
import type { IncomeEntryPayload } from '../../types'

const payload: IncomeEntryPayload = { amount: 500, date: '2026-09-04', method: 'cash' }

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
  } as Response
}

describe('sync engine', () => {
  beforeEach(() => {
    useMemoryBackendForTests()
    vi.stubGlobal('navigator', { onLine: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends every queued entry and empties the outbox', async () => {
    await queueEntry(payload, 'uuid-1')
    await queueEntry({ ...payload, amount: 900 }, 'uuid-2')
    const fetchMock = vi.fn(async () => jsonResponse({ id: 1 }, 201))
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncNow()).toBe(2)
    expect(await listQueuedEntries()).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('replays the stored client_uuid so the server can de-duplicate', async () => {
    await queueEntry(payload, 'uuid-1')
    const sentBodies: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      sentBodies.push(String(init?.body))
      return jsonResponse({ id: 1 }, 201)
    }))

    await syncNow()

    expect(JSON.parse(sentBodies[0]).client_uuid).toBe('uuid-1')
  })

  it('does nothing while the browser reports being offline', async () => {
    await queueEntry(payload, 'uuid-1')
    vi.stubGlobal('navigator', { onLine: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncNow()).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await listQueuedEntries()).toHaveLength(1)
  })

  it('keeps the queue and stops when the connection drops mid-drain', async () => {
    await queueEntry(payload, 'uuid-1')
    await queueEntry({ ...payload, amount: 900 }, 'uuid-2')
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

    expect(await syncNow()).toBe(0)
    expect(await listQueuedEntries()).toHaveLength(2)
    expect(getSyncState().pending).toBe(2)
  })

  it('stops without losing work when the session has expired', async () => {
    await queueEntry(payload, 'uuid-1')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Unauthorized' }, 401)))

    await syncNow()

    expect(await listQueuedEntries()).toHaveLength(1)
    expect(getSyncState().lastError).toMatch(/sign in/i)
  })

  it('records a failed attempt but keeps a rejected entry for another try', async () => {
    await queueEntry(payload, 'uuid-1')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'amount is required' }, 400)))

    await syncNow()

    const [queued] = await listQueuedEntries()
    expect(queued.attempts).toBe(1)
    expect(queued.last_error).toBe('amount is required')
  })

  it('gives up on an entry the server keeps rejecting', async () => {
    await queueEntry(payload, 'uuid-1')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'amount is required' }, 400)))

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await syncNow()
    }

    expect(await listQueuedEntries()).toHaveLength(0)
    expect(getSyncState().lastError).toMatch(/discarded/i)
  })

  it('reports the pending count through its state', async () => {
    await queueEntry(payload, 'uuid-1')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ id: 1 }, 201)))

    await syncNow()

    expect(getSyncState().pending).toBe(0)
    expect(getSyncState().syncing).toBe(false)
  })
})

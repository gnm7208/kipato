import { beforeEach, describe, expect, it } from 'vitest'
import {
  countQueuedEntries,
  listQueuedEntries,
  markQueuedEntryTried,
  newClientUuid,
  queueEntry,
  readCache,
  removeQueuedEntry,
  useMemoryBackendForTests,
  writeCache,
  clearOfflineData,
} from '../offline-store'
import type { IncomeEntryPayload } from '../../types'

const payload: IncomeEntryPayload = { amount: 500, date: '2026-09-04', method: 'cash' }

describe('offline store', () => {
  beforeEach(() => {
    useMemoryBackendForTests()
  })

  it('queues an entry under its client uuid', async () => {
    const queued = await queueEntry(payload, 'uuid-1')

    expect(queued.client_uuid).toBe('uuid-1')
    expect(queued.payload.client_uuid).toBe('uuid-1')
    expect(await countQueuedEntries()).toBe(1)
  })

  it('re-queuing the same uuid replaces rather than duplicates', async () => {
    await queueEntry(payload, 'uuid-1')
    await queueEntry({ ...payload, amount: 900 }, 'uuid-1')

    const queued = await listQueuedEntries()
    expect(queued).toHaveLength(1)
    expect(queued[0].payload.amount).toBe(900)
  })

  it('keeps queued entries in the order they were logged', async () => {
    await queueEntry({ ...payload, amount: 1 }, 'a')
    await new Promise((resolve) => setTimeout(resolve, 2))
    await queueEntry({ ...payload, amount: 2 }, 'b')

    expect((await listQueuedEntries()).map((item) => item.client_uuid)).toEqual(['a', 'b'])
  })

  it('records failed attempts against an entry', async () => {
    const queued = await queueEntry(payload, 'uuid-1')
    await markQueuedEntryTried(queued, 'boom')

    const [stored] = await listQueuedEntries()
    expect(stored.attempts).toBe(1)
    expect(stored.last_error).toBe('boom')
  })

  it('removes a queued entry once it has synced', async () => {
    await queueEntry(payload, 'uuid-1')
    await removeQueuedEntry('uuid-1')

    expect(await countQueuedEntries()).toBe(0)
  })

  it('round-trips cached reads', async () => {
    await writeCache('income:entries', { entries: [], total: 0 })

    expect(await readCache('income:entries')).toEqual({ entries: [], total: 0 })
    expect(await readCache('missing')).toBeNull()
  })

  it('clears everything on sign-out', async () => {
    await queueEntry(payload, 'uuid-1')
    await writeCache('income:entries', { entries: [] })

    await clearOfflineData()

    expect(await countQueuedEntries()).toBe(0)
    expect(await readCache('income:entries')).toBeNull()
  })

  it('generates distinct client uuids', () => {
    expect(newClientUuid()).not.toBe(newClientUuid())
  })
})

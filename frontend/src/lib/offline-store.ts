/**
 * Durable storage for offline work.
 *
 * Two things live here: an **outbox** of income entries logged while the phone
 * had no signal, and a **cache** of the last successful reads so the app still
 * shows a worker their record when they open it offline.
 *
 * IndexedDB is used when the browser has it; otherwise everything falls back to
 * memory, which keeps the app (and the tests) working rather than throwing.
 */

import type { IncomeEntryPayload, OutboxEntry } from '../types'

const DB_NAME = 'kipato-offline'
const DB_VERSION = 1
const OUTBOX_STORE = 'outbox'
const CACHE_STORE = 'cache'

export type { OutboxEntry }

interface CacheRecord {
  key: string
  value: unknown
  stored_at: string
}

type Backend = {
  getOutbox(): Promise<OutboxEntry[]>
  putOutbox(entry: OutboxEntry): Promise<void>
  deleteOutbox(clientUuid: string): Promise<void>
  getCache(key: string): Promise<CacheRecord | undefined>
  putCache(record: CacheRecord): Promise<void>
  clear(): Promise<void>
}

function createMemoryBackend(): Backend {
  const outbox = new Map<string, OutboxEntry>()
  const cache = new Map<string, CacheRecord>()

  return {
    async getOutbox() {
      return [...outbox.values()].sort((a, b) => a.queued_at.localeCompare(b.queued_at))
    },
    async putOutbox(entry) {
      outbox.set(entry.client_uuid, entry)
    },
    async deleteOutbox(clientUuid) {
      outbox.delete(clientUuid)
    },
    async getCache(key) {
      return cache.get(key)
    },
    async putCache(record) {
      cache.set(record.key, record)
    },
    async clear() {
      outbox.clear()
      cache.clear()
    },
  }
}

function createIndexedDbBackend(): Backend {
  let dbPromise: Promise<IDBDatabase> | null = null

  const openDb = () => {
    if (!dbPromise) {
      dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const openRequest = indexedDB.open(DB_NAME, DB_VERSION)
        openRequest.onupgradeneeded = () => {
          const db = openRequest.result
          if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
            db.createObjectStore(OUTBOX_STORE, { keyPath: 'client_uuid' })
          }
          if (!db.objectStoreNames.contains(CACHE_STORE)) {
            db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
          }
        }
        openRequest.onsuccess = () => resolve(openRequest.result)
        openRequest.onerror = () => reject(openRequest.error)
      })
    }
    return dbPromise
  }

  const run = async <T>(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const db = await openDb()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const request = action(transaction.objectStore(storeName))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  return {
    async getOutbox() {
      const rows = await run<OutboxEntry[]>(OUTBOX_STORE, 'readonly', (store) => store.getAll())
      return rows.sort((a, b) => a.queued_at.localeCompare(b.queued_at))
    },
    async putOutbox(entry) {
      await run(OUTBOX_STORE, 'readwrite', (store) => store.put(entry))
    },
    async deleteOutbox(clientUuid) {
      await run(OUTBOX_STORE, 'readwrite', (store) => store.delete(clientUuid))
    },
    async getCache(key) {
      return run<CacheRecord | undefined>(CACHE_STORE, 'readonly', (store) => store.get(key))
    },
    async putCache(record) {
      await run(CACHE_STORE, 'readwrite', (store) => store.put(record))
    },
    async clear() {
      await run(OUTBOX_STORE, 'readwrite', (store) => store.clear())
      await run(CACHE_STORE, 'readwrite', (store) => store.clear())
    },
  }
}

function selectBackend(): Backend {
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB !== null) {
      return createIndexedDbBackend()
    }
  } catch {
    // Private browsing modes can throw on access rather than return undefined.
  }
  return createMemoryBackend()
}

let backend: Backend = selectBackend()

/** Swaps in a clean in-memory backend. Used by tests. */
export function useMemoryBackendForTests() {
  backend = createMemoryBackend()
}

export function newClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function queueEntry(
  payload: IncomeEntryPayload,
  clientUuid: string,
): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    client_uuid: clientUuid,
    payload: { ...payload, client_uuid: clientUuid },
    queued_at: new Date().toISOString(),
    attempts: 0,
  }
  await backend.putOutbox(entry)
  return entry
}

export async function listQueuedEntries(): Promise<OutboxEntry[]> {
  try {
    return await backend.getOutbox()
  } catch {
    return []
  }
}

export async function markQueuedEntryTried(entry: OutboxEntry, error: string): Promise<void> {
  await backend.putOutbox({ ...entry, attempts: entry.attempts + 1, last_error: error })
}

export async function removeQueuedEntry(clientUuid: string): Promise<void> {
  await backend.deleteOutbox(clientUuid)
}

export async function countQueuedEntries(): Promise<number> {
  return (await listQueuedEntries()).length
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const record = await backend.getCache(key)
    return record ? (record.value as T) : null
  } catch {
    return null
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await backend.putCache({ key, value, stored_at: new Date().toISOString() })
  } catch {
    // A full or unavailable store must never break a working request.
  }
}

export async function clearOfflineData(): Promise<void> {
  try {
    await backend.clear()
  } catch {
    // Nothing to do; the store is already unusable.
  }
}

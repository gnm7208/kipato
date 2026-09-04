/**
 * Drains the offline outbox.
 *
 * Entries logged without a signal sit in IndexedDB until this engine can post
 * them. Every queued entry carries a `client_uuid`, and the API treats a repeat
 * of that key as the same entry, so replaying is always safe.
 */

import { ApiError, NetworkError, request } from './http'
import {
  listQueuedEntries,
  markQueuedEntryTried,
  removeQueuedEntry,
} from './offline-store'
import type { IncomeEntry } from '../types'

export interface SyncState {
  pending: number
  syncing: boolean
  lastSyncedAt: string | null
  lastError: string | null
}

type Listener = (state: SyncState) => void

/** A payload the server has rejected this many times is not going to be accepted. */
const MAX_ATTEMPTS = 5

let state: SyncState = { pending: 0, syncing: false, lastSyncedAt: null, lastError: null }
const listeners = new Set<Listener>()
let started = false
let draining = false

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

export function getSyncState(): SyncState {
  return state
}

export function subscribeToSync(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

export async function refreshPendingCount(): Promise<number> {
  const pending = (await listQueuedEntries()).length
  setState({ pending })
  return pending
}

/**
 * Sends everything in the outbox. Resolves with the number of entries that
 * reached the server, so callers can refresh their views only when it matters.
 */
export async function syncNow(): Promise<number> {
  if (draining) return 0
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    await refreshPendingCount()
    return 0
  }

  draining = true
  setState({ syncing: true, lastError: null })

  let synced = 0
  try {
    for (const queued of await listQueuedEntries()) {
      try {
        await request<IncomeEntry>('/api/income/entries', {
          method: 'POST',
          json: queued.payload,
        })
        await removeQueuedEntry(queued.client_uuid)
        synced += 1
      } catch (error: unknown) {
        if (error instanceof NetworkError) {
          // Still offline. Leave the rest of the queue for the next attempt.
          setState({ lastError: 'Still offline' })
          break
        }
        if (error instanceof ApiError && error.status === 401) {
          // Signed out: keep the work, stop trying until they sign back in.
          setState({ lastError: 'Sign in to finish syncing' })
          break
        }

        const message = error instanceof Error ? error.message : 'Sync failed'
        if (queued.attempts + 1 >= MAX_ATTEMPTS) {
          // The server will never take this one; drop it rather than blocking
          // every entry queued behind it.
          await removeQueuedEntry(queued.client_uuid)
          setState({ lastError: `Discarded an entry the server rejected: ${message}` })
        } else {
          await markQueuedEntryTried(queued, message)
          setState({ lastError: message })
        }
      }
    }
  } finally {
    draining = false
    const pending = (await listQueuedEntries()).length
    setState({
      syncing: false,
      pending,
      lastSyncedAt: synced > 0 ? new Date().toISOString() : state.lastSyncedAt,
    })
  }

  return synced
}

/**
 * Starts syncing on reconnect. `onSynced` fires only when entries actually
 * reached the server, which is the moment cached views need refreshing.
 */
export function startSyncEngine(onSynced?: (count: number) => void): () => void {
  const drain = () => {
    void syncNow().then((count) => {
      if (count > 0) onSynced?.(count)
    })
  }

  if (started) {
    drain()
    return () => undefined
  }
  started = true

  window.addEventListener('online', drain)
  drain()

  return () => {
    window.removeEventListener('online', drain)
    started = false
  }
}

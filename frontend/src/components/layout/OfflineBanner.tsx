import { CloudUpload, LoaderCircle, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnlineStatus } from '../../lib/online-status'
import { getSyncState, subscribeToSync, syncNow, type SyncState } from '../../lib/sync-engine'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [sync, setSync] = useState<SyncState>(getSyncState)

  useEffect(() => subscribeToSync(setSync), [])

  if (isOnline && sync.pending === 0) return null

  const label = !isOnline
    ? sync.pending > 0
      ? `Offline — ${countLabel(sync.pending)} saved on this phone`
      : 'You are offline. Showing saved records.'
    : sync.syncing
      ? `Syncing ${countLabel(sync.pending)}…`
      : `${countLabel(sync.pending)} waiting to sync`

  const Icon = !isOnline ? WifiOff : sync.syncing ? LoaderCircle : CloudUpload

  return (
    <div
      className="flex items-center justify-center gap-3 border-b-2 border-ink bg-sun px-4 py-2 text-xs font-bold text-ink"
      role="status"
    >
      <span className="inline-flex items-center gap-2">
        <Icon aria-hidden="true" className={sync.syncing ? 'animate-spin' : undefined} size={15} />
        {label}
      </span>
      {isOnline && !sync.syncing && sync.pending > 0 && (
        <button
          className="border-2 border-ink bg-paper px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em]"
          onClick={() => void syncNow()}
          type="button"
        >
          Sync now
        </button>
      )}
    </div>
  )
}

function countLabel(count: number) {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`
}

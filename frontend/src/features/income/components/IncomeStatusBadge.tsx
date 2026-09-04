import { Check, Clock3, TriangleAlert } from 'lucide-react'
import { Badge } from '../../../components/ui'
import { formatSyncStatus } from '../../../lib/formatters'
import type { SyncStatus } from '../../../types'

export function IncomeStatusBadge({ status }: { status: SyncStatus }) {
  const Icon = status === 'synced' ? Check : status === 'pending' ? Clock3 : TriangleAlert
  const tone = status === 'synced' ? 'jade' : status === 'pending' ? 'sun' : 'danger'
  return <Badge tone={tone}><Icon aria-hidden="true" size={12} /> {formatSyncStatus(status)}</Badge>
}

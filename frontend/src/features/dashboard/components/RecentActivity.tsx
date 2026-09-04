import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui'
import { formatDate, formatKsh, formatMethod } from '../../../lib/formatters'
import type { IncomeEntry } from '../../../types'

export function RecentActivity({ entries }: { entries: IncomeEntry[] }) {
  return (
    <section aria-labelledby="activity-title">
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Your proof, in motion</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight" id="activity-title">Recent activity</h2>
        </div>
        <Link className="inline-flex min-h-11 items-center gap-1 text-xs font-bold underline decoration-2 underline-offset-4" to="/app/records">View all <ArrowRight aria-hidden="true" size={14} /></Link>
      </div>
      {entries.length === 0 ? (
        <div className="border-y-2 border-ink py-8 text-sm text-muted">No income recorded yet. Add your first record to get started.</div>
      ) : (
        <div className="border-y-3 border-ink">
          {entries.slice(0, 3).map((entry) => (
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b-2 border-ink/15 py-4 last:border-b-0" key={entry.id}>
              <div>
                <p className="font-display text-sm font-bold">{entry.date === new Date().toISOString().slice(0, 10) ? 'Today' : formatDate(entry.date).split(' ').slice(0, 2).join(' ')}</p>
                <p className="mt-0.5 text-[0.68rem] text-muted">{formatDate(entry.date).split(' ').slice(-1)}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{entry.note || 'Income record'}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted">
                  <span aria-hidden="true" className={`h-2 w-2 ${entry.method === 'mpesa' ? 'bg-jade' : 'bg-sun'}`} />
                  {formatMethod(entry.method)}
                  {entry.sync_status === 'synced' ? <CircleCheck aria-label="Synced" className="text-jade" size={13} /> : <Badge className="ml-1 px-1 py-0 text-[0.55rem]" tone={entry.sync_status === 'failed' ? 'danger' : 'sun'}>{entry.sync_status}</Badge>}
                </p>
              </div>
              <p className="font-display text-sm font-bold">+{formatKsh(entry.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

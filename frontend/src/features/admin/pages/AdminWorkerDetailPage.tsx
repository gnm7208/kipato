import { CalendarDays, FileText, Phone, Receipt, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '../../../components/layout'
import { InlineAlert } from '../../../components/feedback'
import { Badge, EmptyState, HardCard, LoadingState, Pagination } from '../../../components/ui'
import {
  useAdminWorker,
  useAdminWorkerEntries,
  useAdminWorkerStatements,
} from '../../../data/hooks'
import { formatDate, formatKsh, formatMethod, formatPhone } from '../../../lib/formatters'

export function AdminWorkerDetailPage() {
  const { workerId } = useParams()
  const id = workerId ? Number(workerId) : undefined
  const [page, setPage] = useState(1)

  const workerQuery = useAdminWorker(id)
  const entriesQuery = useAdminWorkerEntries(id, { page, perPage: 20 })
  const statementsQuery = useAdminWorkerStatements(id)

  if (workerQuery.isLoading) return <LoadingState label="Loading worker record" />
  if (workerQuery.isError || !workerQuery.data) {
    return (
      <div className="space-y-6">
        <PageHeader backTo="/admin/workers" eyebrow="Verification desk" title="Worker" />
        <InlineAlert title="Could not load this worker">
          They may have been removed, or the connection dropped.
        </InlineAlert>
      </div>
    )
  }

  const worker = workerQuery.data.worker
  const entries = entriesQuery.data
  const statements = statementsQuery.data?.statements ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/admin/workers"
        description="Read-only. A worker's record stays theirs."
        eyebrow="Verification desk"
        title={worker.full_name}
      />

      <HardCard as="section" className="overflow-hidden" shadow="sun">
        <div className="border-b-2 border-ink bg-sun p-5">
          <p className="font-display text-3xl font-bold leading-none tracking-[-0.05em]">
            {formatKsh(worker.total_income)}
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em]">Total income recorded</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 p-5">
          <Detail icon={<Phone aria-hidden="true" size={18} />} label="Phone" value={formatPhone(worker.phone)} />
          <Detail icon={<Receipt aria-hidden="true" size={18} />} label="Entries" value={String(worker.entry_count)} />
          <Detail
            icon={<CalendarDays aria-hidden="true" size={18} />}
            label="Last logged"
            value={worker.last_entry_date ? formatDate(worker.last_entry_date) : 'Never'}
          />
          <Detail
            icon={<FileText aria-hidden="true" size={18} />}
            label="Statements"
            value={String(worker.statement_count ?? statements.length)}
          />
        </dl>
        <div className="flex items-center gap-2 border-t-2 border-ink/15 px-5 pb-5 pt-4 text-sm font-semibold">
          <ShieldCheck aria-hidden="true" className={worker.email_verified ? 'text-jade' : 'text-muted'} size={18} />
          {worker.email_verified ? 'Contact verified' : 'Contact not verified'}
        </div>
      </HardCard>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Income entries</h2>
        {entriesQuery.isLoading ? <LoadingState label="Loading entries" /> : null}
        {entries && entries.entries.length === 0 ? (
          <EmptyState
            description="This worker has not logged any income yet."
            icon={<Receipt aria-hidden="true" size={22} />}
            title="Nothing recorded"
          />
        ) : null}
        {entries && entries.entries.length > 0 ? (
          <>
            <div className="border-y-3 border-ink bg-paper">
              {entries.entries.map((entry) => (
                <div className="flex items-center justify-between gap-3 border-b-2 border-ink/10 px-4 py-3 last:border-b-0" key={entry.id}>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold">{formatDate(entry.date)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{entry.note || 'Income record'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={entry.method === 'mpesa' ? 'jade' : 'sun'}>{formatMethod(entry.method)}</Badge>
                    <p className="font-display text-sm font-bold">{formatKsh(entry.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination onChange={setPage} page={entries.page} pages={entries.pages} />
          </>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Statements generated</h2>
        {statements.length === 0 ? (
          <EmptyState
            description="This worker has not generated a statement yet."
            icon={<FileText aria-hidden="true" size={22} />}
            title="No statements"
          />
        ) : (
          <div className="border-y-3 border-ink bg-paper">
            {statements.map((statement) => (
              <div className="flex items-center justify-between gap-3 border-b-2 border-ink/10 px-4 py-3 last:border-b-0" key={statement.id}>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold">
                    {formatDate(statement.start_date)} — {formatDate(statement.end_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {statement.entry_count} records · generated {formatDate(statement.generated_at)}
                  </p>
                </div>
                <p className="shrink-0 font-display text-sm font-bold">{formatKsh(statement.total_income)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
        <dd className="mt-0.5 truncate font-semibold">{value}</dd>
      </div>
    </div>
  )
}

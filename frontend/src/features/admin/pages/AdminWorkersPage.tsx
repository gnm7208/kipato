import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../components/layout'
import { InlineAlert } from '../../../components/feedback'
import {
  EmptyState,
  HardCard,
  LoadingState,
  Pagination,
  TextInput,
} from '../../../components/ui'
import { useAdminWorkers } from '../../../data/hooks'
import { formatDate, formatKsh, formatPhone } from '../../../lib/formatters'

export function AdminWorkersPage() {
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({ search: submittedSearch || undefined, page, perPage: 20 }),
    [page, submittedSearch],
  )
  const { data, isLoading, isError } = useAdminWorkers(params)

  return (
    <div className="space-y-6">
      <PageHeader
        description="Open a worker to read the record behind an income claim."
        eyebrow="Verification desk"
        title="Workers"
      />

      <HardCard as="section" className="p-4" shadow="none">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setSubmittedSearch(search.trim())
          }}
        >
          <label className="sr-only" htmlFor="worker-search">Search workers</label>
          <TextInput
            id="worker-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, phone or email"
            value={search}
          />
          <button
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border-3 border-ink bg-ink px-4 font-display text-sm font-bold text-paper shadow-[3px_3px_0_var(--color-sun)] transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            type="submit"
          >
            <Search aria-hidden="true" size={17} /> Search
          </button>
        </form>
      </HardCard>

      {isLoading ? <LoadingState label="Loading workers" /> : null}
      {isError ? <InlineAlert title="Could not load workers">Check your connection and try again.</InlineAlert> : null}

      {data ? (
        data.workers.length === 0 ? (
          <EmptyState
            description={submittedSearch ? `Nothing matched “${submittedSearch}”.` : 'No workers have signed up yet.'}
            icon={<Users aria-hidden="true" size={22} />}
            title="No workers found"
          />
        ) : (
          <section className="space-y-3">
            <p className="text-sm font-bold">{data.total} {data.total === 1 ? 'worker' : 'workers'}</p>
            {data.workers.map((worker) => (
              <Link
                className="block border-3 border-ink bg-paper p-4 shadow-[4px_4px_0_var(--color-ink)] transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                key={worker.id}
                to={`/admin/workers/${worker.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">{worker.full_name}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatPhone(worker.phone)}</p>
                  </div>
                  <p className="shrink-0 font-display text-base font-bold">{formatKsh(worker.total_income)}</p>
                </div>
                <p className="mt-3 border-t-2 border-ink/10 pt-2 text-xs text-muted">
                  {worker.entry_count} {worker.entry_count === 1 ? 'entry' : 'entries'}
                  {worker.last_entry_date ? ` · last logged ${formatDate(worker.last_entry_date)}` : ' · nothing logged yet'}
                </p>
              </Link>
            ))}
            <Pagination onChange={setPage} page={data.page} pages={data.pages} />
          </section>
        )
      ) : null}
    </div>
  )
}

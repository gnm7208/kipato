import { ArrowRight, FileText, MessageSquareText, Receipt, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../components/layout'
import { HardCard, LoadingState } from '../../../components/ui'
import { InlineAlert } from '../../../components/feedback'
import { useAdminStats } from '../../../data/hooks'
import { useAuth } from '../../auth/auth-context'
import { formatKsh } from '../../../lib/formatters'

export function AdminOverviewPage() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useAdminStats()

  return (
    <div className="space-y-6">
      <PageHeader
        description="What workers have recorded across Kipato. Records stay worker-owned — you can read them to verify income, never edit them."
        eyebrow="Verification desk"
        title="Overview"
      />

      {isLoading ? <LoadingState label="Loading platform totals" /> : null}
      {isError ? <InlineAlert tone="error" title="Could not load totals">Check your connection and try again.</InlineAlert> : null}

      {data ? (
        <>
          <HardCard as="section" className="relative overflow-hidden p-5" shadow="sun" tone="ink">
            <div aria-hidden="true" className="absolute right-0 top-0 h-16 w-16 bg-sun" />
            <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-paper/65">Income recorded on Kipato</p>
            <p className="relative mt-6 break-words font-display text-[clamp(2.4rem,11vw,4rem)] font-bold leading-none tracking-[-0.08em]">
              {formatKsh(data.total_income)}
            </p>
            <p className="relative mt-4 border-t border-paper/25 pt-3 text-xs text-paper/70">
              Signed in as {user?.full_name ?? data.generated_by}
            </p>
          </HardCard>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={<Users aria-hidden="true" size={19} />} label="Workers" value={String(data.worker_count)} />
            <StatTile icon={<Receipt aria-hidden="true" size={19} />} label="Entries" value={String(data.entry_count)} />
            <StatTile icon={<MessageSquareText aria-hidden="true" size={19} />} label="M-PESA imports" value={String(data.import_count)} />
            <StatTile icon={<FileText aria-hidden="true" size={19} />} label="Statements" value={String(data.statement_count)} />
          </section>

          <HardCard as="section" className="p-5" shadow="ink">
            <h2 className="font-display text-lg font-bold">Verify a worker</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Open a worker to read their entries and the statements they have generated.
            </p>
            <Link
              className="mt-4 inline-flex min-h-12 items-center gap-2 border-3 border-ink bg-sun px-4 font-display text-sm font-bold shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              to="/admin/workers"
            >
              Browse workers <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </HardCard>
        </>
      ) : null}
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <HardCard className="p-4" shadow="none">
      <div className="flex items-center gap-2 text-muted">{icon}</div>
      <p className="mt-3 font-display text-2xl font-bold leading-none tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
    </HardCard>
  )
}

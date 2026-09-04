import { CheckCircle2 } from 'lucide-react'
import { HardCard } from '../../../components/ui'
import { formatDate, formatDateRange, formatKsh, formatMethod } from '../../../lib/formatters'
import { getMpesaShare } from '../../../lib/analytics'
import type { StatementDetail, User } from '../../../types'

interface StatementTicketProps {
  statement: StatementDetail
  user: User
}

export function StatementTicket({ statement, user }: StatementTicketProps) {
  const mpesaShare = getMpesaShare(statement.entries)
  const displayEntries = statement.entries.slice(0, 5)

  return (
    <HardCard as="article" className="statement-perforated overflow-hidden" shadow="ink">
      <div className="h-3 border-b-3 border-ink bg-sun" />
      <div className="relative z-10 px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-bold tracking-tight">KIPATO</p><p className="mt-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-muted">Verified income</p></div><div className="border-2 border-ink px-2 py-1 text-right"><p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted">Record no.</p><p className="font-display text-xs font-bold">KP-{String(statement.id).padStart(4, '0')}</p></div></div>
        <div className="mt-6"><p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-muted">Worker</p><p className="mt-1 font-display text-2xl font-bold tracking-[-0.045em]">{user.full_name}</p></div>
        <div className="my-5 border-t-2 border-dashed border-ink/45" />
        <div className="grid grid-cols-2 gap-5"><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-muted">Period</p><p className="mt-1 font-display text-xs font-bold">{formatDateRange(statement.start_date, statement.end_date)}</p></div><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-muted">Entries</p><p className="mt-1 font-display text-xs font-bold">{statement.entry_count} records</p></div><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-muted">Total declared</p><p className="mt-1 font-display text-xl font-bold tracking-[-0.04em]">{formatKsh(statement.total_income)}</p></div><div><p className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-muted">M-PESA backed</p><p className="mt-1 font-display text-xl font-bold tracking-[-0.04em] text-jade">{mpesaShare}%</p></div></div>
        <div className="my-5 border-t-2 border-dashed border-ink/45" />
        <div className="mb-2 flex items-center justify-between gap-3"><span className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-muted">Representative entries</span><span className="text-[0.64rem] font-semibold text-muted">{displayEntries.length} of {statement.entry_count} shown</span></div>
        <div className="space-y-2">{displayEntries.map((entry) => <div className="flex items-center justify-between gap-3 border-b border-ink/15 pb-2 text-xs last:border-b-0" key={entry.id}><span className="min-w-0 truncate"><b className="font-display">{formatDate(entry.date)}</b><span className="ml-2 text-muted">{formatMethod(entry.method)} · {entry.note || 'Income record'}</span></span><b className="shrink-0 font-display">{formatKsh(entry.amount)}</b></div>)}</div>
        <div className="mt-5 border-t-2 border-dashed border-ink/45 pt-4"><div aria-hidden="true" className="barcode h-9 w-full border-y-2 border-ink" /><div className="mt-2 flex items-center justify-between text-[0.58rem] font-bold uppercase tracking-[0.13em] text-muted"><span>Worker-owned record</span><span>{formatDate(statement.generated_at)}</span></div></div>
      </div>
      <div className="sr-only"><CheckCircle2 aria-hidden="true" /> This statement is a worker-owned record.</div>
    </HardCard>
  )
}

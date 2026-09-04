import { ArrowRight, FileCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../../components/ui'
import { formatDate, formatKsh } from '../../../lib/formatters'
import type { Statement } from '../../../types'

export function StatementList({ statements }: { statements: Statement[] }) {
  if (statements.length === 0) return <EmptyState description="Generate a statement from your income records." icon={<FileCheck2 aria-hidden="true" size={22} />} title="No statements generated yet" />

  return <section aria-labelledby="statement-history-title"><div className="mb-3 flex items-baseline justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Worker-owned proof</p><h2 className="mt-1 font-display text-2xl font-bold" id="statement-history-title">Statement history</h2></div><span className="text-xs font-bold text-muted">{statements.length} total</span></div><div className="border-y-3 border-ink bg-paper">{statements.map((statement) => <Link className="flex items-center justify-between gap-4 border-b-2 border-ink/10 px-4 py-4 transition-colors last:border-b-0 hover:bg-sun/15" key={statement.id} to={`/app/statements/${statement.id}`}><div className="min-w-0"><p className="font-display text-sm font-bold">{formatDate(statement.start_date)} — {formatDate(statement.end_date)}</p><p className="mt-1 text-xs text-muted">{statement.entry_count} records · Generated {formatDate(statement.generated_at)}</p></div><div className="flex shrink-0 items-center gap-3"><span className="text-right font-display text-sm font-bold">{formatKsh(statement.total_income)}</span><ArrowRight aria-hidden="true" size={18} /></div></Link>)}</div></section>
}

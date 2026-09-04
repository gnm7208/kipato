import { MessageSquareText } from 'lucide-react'
import { EmptyState, LoadingState } from '../../../components/ui'
import { formatDate, formatEntriesCount } from '../../../lib/formatters'
import type { MpesaImport } from '../../../types'

interface ImportHistoryProps {
  imports: MpesaImport[]
  isLoading: boolean
}

export function ImportHistory({ imports, isLoading }: ImportHistoryProps) {
  return (
    <section aria-labelledby="import-history-title">
      <div className="mb-3 flex items-baseline justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Your evidence trail</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight" id="import-history-title">Import history</h2></div><span className="text-xs font-bold text-muted">{imports.length} imports</span></div>
      {isLoading ? <LoadingState label="Loading import history" /> : imports.length === 0 ? <EmptyState description="Paste a message above to bring your M-PESA records into Kipato." icon={<MessageSquareText aria-hidden="true" size={22} />} title="No imports yet" /> : <div className="border-y-3 border-ink bg-paper">{imports.map((item) => <div className="flex items-center justify-between gap-3 border-b-2 border-ink/10 px-4 py-4 last:border-b-0" key={item.id}><div className="min-w-0"><p className="truncate font-display text-sm font-bold">{item.file_name || item.source_ref}</p><p className="mt-1 text-xs text-muted">Imported {formatDate(item.imported_at)}</p></div><span className="shrink-0 text-right text-xs font-bold uppercase tracking-[0.08em] text-jade">{formatEntriesCount(item.entries_count)}<br /><span className="text-[0.62rem] text-muted">matched</span></span></div>)}</div>}
    </section>
  )
}

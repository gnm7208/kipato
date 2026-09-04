import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../components/ui'
import { formatDate, formatKsh, formatMethod } from '../../../lib/formatters'
import type { IncomeEntry } from '../../../types'
import { IncomeStatusBadge } from './IncomeStatusBadge'

interface IncomeTableProps {
  entries: IncomeEntry[]
  onEdit: (entry: IncomeEntry) => void
  onDelete: (entry: IncomeEntry) => void
}

export function IncomeTable({ entries, onEdit, onDelete }: IncomeTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto border-3 border-ink bg-paper md:block">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <caption className="sr-only">Income records</caption>
          <thead className="bg-ink text-paper">
            <tr className="text-xs uppercase tracking-[0.12em]">
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Description</th>
              <th className="px-4 py-3 font-bold">Method</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Amount</th>
              <th className="px-4 py-3 text-right font-bold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b-2 border-ink/10 last:border-b-0 hover:bg-sun/15" key={entry.id}>
                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold">{formatDate(entry.date)}</td>
                <td className="max-w-[220px] truncate px-4 py-4 text-sm">{entry.note || 'Income record'}</td>
                <td className="px-4 py-4 text-sm font-semibold">{formatMethod(entry.method)}</td>
                <td className="px-4 py-4"><IncomeStatusBadge status={entry.sync_status} /></td>
                <td className="px-4 py-4 text-right font-display text-sm font-bold">{formatKsh(entry.amount)}</td>
                <td className="px-4 py-4"><div className="flex justify-end gap-1"><IconButton label={`Edit record from ${formatDate(entry.date)}`} onClick={() => onEdit(entry)} size="sm"><Pencil aria-hidden="true" size={16} /></IconButton><IconButton label={`Delete record from ${formatDate(entry.date)}`} onClick={() => onDelete(entry)} size="sm"><Trash2 aria-hidden="true" size={16} /></IconButton></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {entries.map((entry) => (
          <article className="border-2 border-ink bg-paper p-4 shadow-[3px_3px_0_var(--color-ink)]" key={entry.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-display text-sm font-bold">{formatDate(entry.date)}</p><p className="mt-1 truncate text-sm text-muted">{entry.note || 'Income record'}</p></div>
              <p className="shrink-0 font-display text-base font-bold">{formatKsh(entry.amount)}</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><IncomeStatusBadge status={entry.sync_status} /><span className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{formatMethod(entry.method)}</span></div><div className="flex gap-1"><IconButton label={`Edit record from ${formatDate(entry.date)}`} onClick={() => onEdit(entry)} size="sm"><Pencil aria-hidden="true" size={16} /></IconButton><IconButton label={`Delete record from ${formatDate(entry.date)}`} onClick={() => onDelete(entry)} size="sm"><Trash2 aria-hidden="true" size={16} /></IconButton></div></div>
          </article>
        ))}
      </div>
    </>
  )
}

import { Check, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { HardCard } from '../../../components/ui'
import { formatDate, formatKsh } from '../../../lib/formatters'
import type { ParsedMpesaEntry } from '../../../types'

// A whole SMS history runs to hundreds of payments. Showing them all turns the
// page into an endless scroll, so the preview is a sample plus a total.
const PREVIEW_LIMIT = 8

export function ParsedPreview({ entries }: { entries: ParsedMpesaEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null

  const shown = expanded ? entries.slice(0, 200) : entries.slice(0, PREVIEW_LIMIT)
  const hidden = entries.length - shown.length
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <HardCard as="section" className="mt-5 overflow-hidden" shadow="none">
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-jade/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList aria-hidden="true" size={18} />
          <h2 className="font-display text-base font-bold">Ready to import</h2>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.1em] text-ink">
          <Check aria-hidden="true" size={14} />
          {entries.length} found
        </span>
      </div>

      <p className="border-b-2 border-ink/10 px-4 py-3 text-sm">
        <strong>{formatKsh(total)}</strong> of incoming payments
        {entries.length > 1 ? ` across ${entries.length} messages` : null}.
      </p>

      <div className="divide-y-2 divide-ink/10">
        {shown.map((entry, index) => (
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            key={entry.code ?? `${entry.date}-${entry.amount}-${index}`}
          >
            <div className="min-w-0">
              <p className="font-display text-sm font-bold">{formatDate(entry.date)}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {entry.sender ? `From ${entry.sender}` : 'M-PESA message match'}
                {entry.code ? ` · ${entry.code}` : ''}
              </p>
            </div>
            <p className="shrink-0 font-display text-base font-bold text-jade">{formatKsh(entry.amount)}</p>
          </div>
        ))}
      </div>

      {hidden > 0 ? (
        <div className="border-t-2 border-ink/10 px-4 py-3">
          {expanded ? (
            <p className="text-xs text-muted">
              Showing the first {shown.length}. All {entries.length} will be imported.
            </p>
          ) : (
            <button
              className="text-xs font-bold uppercase tracking-[0.1em] underline underline-offset-4"
              onClick={() => setExpanded(true)}
              type="button"
            >
              Show more · {hidden} more {hidden === 1 ? 'payment' : 'payments'}
            </button>
          )}
        </div>
      ) : null}
    </HardCard>
  )
}

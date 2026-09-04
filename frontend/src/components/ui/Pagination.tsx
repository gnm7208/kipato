import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './IconButton'

interface PaginationProps {
  page: number
  pages: number
  onChange: (page: number) => void
}

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t-2 border-ink pt-4">
      <IconButton disabled={page <= 1} label="Previous page" onClick={() => onChange(page - 1)} size="sm">
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.5} />
      </IconButton>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Page <span className="text-ink">{page}</span> of <span className="text-ink">{pages}</span>
      </p>
      <IconButton disabled={page >= pages} label="Next page" onClick={() => onChange(page + 1)} size="sm">
        <ChevronRight aria-hidden="true" size={18} strokeWidth={2.5} />
      </IconButton>
    </nav>
  )
}

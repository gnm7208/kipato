import { MessageSquareText, PlusCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickActionsProps {
  onLogCash: () => void
}

export function QuickActions({ onLogCash }: QuickActionsProps) {
  const navigate = useNavigate()

  return (
    <section aria-labelledby="quick-actions-title">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight" id="quick-actions-title">Keep it current</h2>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Quick actions</span>
      </div>
      <div className="grid grid-cols-[1.22fr_0.92fr] gap-3">
        <button aria-label="Log cash income" className="flex min-h-32 flex-col justify-between border-3 border-ink bg-sun p-4 text-left shadow-hard transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" onClick={onLogCash} type="button">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center border-3 border-ink bg-ink text-sun"><PlusCircle size={25} strokeWidth={2.5} /></span>
          <span>
            <span className="block font-display text-xl font-bold leading-none">Log cash</span>
            <span className="mt-1 block text-xs font-semibold">Add today's earning</span>
          </span>
        </button>
        <button aria-label="Import M-PESA records" className="flex min-h-32 flex-col justify-between border-3 border-dashed border-ink bg-paper p-4 text-left transition-colors hover:bg-sun/20" onClick={() => navigate('/app/imports')} type="button">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center border-2 border-ink text-ink"><MessageSquareText size={23} strokeWidth={2.5} /></span>
          <span>
            <span className="block font-display text-base font-bold leading-[1.05]">Import<br />M-PESA</span>
            <span className="mt-1 block text-xs font-semibold text-muted">Paste a message</span>
          </span>
        </button>
      </div>
    </section>
  )
}

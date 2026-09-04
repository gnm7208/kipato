import { LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div aria-live="polite" className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-muted">
      <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
      {label}
    </div>
  )
}

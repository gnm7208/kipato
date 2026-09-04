import { AlertTriangle } from 'lucide-react'
import { BrutalistButton } from './BrutalistButton'
import { BottomSheet } from './BottomSheet'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', pending = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <BottomSheet open={open} title={title} eyebrow="Please confirm" onClose={onClose}>
      <div className="flex gap-3 border-2 border-ink bg-sun/20 p-4">
        <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={22} />
        <p className="text-sm leading-6">{description}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <BrutalistButton onClick={onClose} variant="outline">Cancel</BrutalistButton>
        <BrutalistButton disabled={pending} onClick={onConfirm} variant="ink">
          {pending ? 'Deleting…' : confirmLabel}
        </BrutalistButton>
      </div>
    </BottomSheet>
  )
}

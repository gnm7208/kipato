import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  labelledBy?: string
}

export function BottomSheet({ open, title, eyebrow, onClose, children, footer, labelledBy = 'bottom-sheet-title' }: BottomSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div aria-hidden="true" className="absolute inset-0 bg-ink/75" />
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="relative flex max-h-[88svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-md border-t-3 border-ink bg-canvas shadow-[0_-5px_0_var(--color-ink)]"
        role="dialog"
      >
        <div className="flex justify-center pt-3" aria-hidden="true">
          <span className="h-1.5 w-16 bg-ink" />
        </div>
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 pb-4 pt-3">
          <div>
            {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{eyebrow}</p> : null}
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight" id={labelledBy}>{title}</h2>
          </div>
          <button ref={closeButtonRef} aria-label={`Close ${title}`} className="flex h-11 w-11 shrink-0 items-center justify-center border-3 border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)]" onClick={onClose} type="button">
            <X aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
        {footer ? <footer className="safe-bottom border-t-2 border-ink bg-canvas px-5 pb-5 pt-3">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}

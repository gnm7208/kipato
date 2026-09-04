import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { IconButton } from '../ui/IconButton'
import type { ToastVariant } from '../../types'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastIcons = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
}

const toastColors = {
  success: 'border-jade bg-jade/15',
  info: 'border-ink bg-paper',
  warning: 'border-ink bg-sun/25',
  error: 'border-red-700 bg-red-50',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current.slice(-2), { ...toast, id }])
    },
    [],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-label="Notifications" className="fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-md flex-col gap-3" role="region">
        {toasts.map((toast) => (
          <ToastItemView dismiss={() => dismissToast(toast.id)} key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItemView({ toast, dismiss }: { toast: ToastItem; dismiss: () => void }) {
  const Icon = toastIcons[toast.variant]

  useEffect(() => {
    const timer = window.setTimeout(dismiss, 4500)
    return () => window.clearTimeout(timer)
  }, [dismiss])

  return (
    <div aria-live={toast.variant === 'error' ? 'assertive' : 'polite'} className={`flex items-start gap-3 border-2 p-3 shadow-hard ${toastColors[toast.variant]}`} role="status">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-xs leading-5 text-muted">{toast.description}</p> : null}
      </div>
      <IconButton label="Dismiss notification" onClick={dismiss} size="sm">
        <X aria-hidden="true" size={16} />
      </IconButton>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

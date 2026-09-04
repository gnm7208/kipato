import { AlertCircle, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

interface InlineAlertProps {
  title?: string
  children: ReactNode
  tone?: 'error' | 'warning' | 'info'
  action?: ReactNode
}

export function InlineAlert({ title, children, tone = 'error', action }: InlineAlertProps) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'warning' ? TriangleAlert : Info
  const styles = {
    error: 'border-red-700 bg-red-50 text-red-900',
    warning: 'border-ink bg-sun/25 text-ink',
    info: 'border-ink bg-paper text-ink',
  }

  return (
    <div aria-live={tone === 'error' ? 'assertive' : 'polite'} className={`flex gap-3 border-2 p-3 text-sm ${styles[tone]}`} role="alert">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        <div className={title ? 'mt-1' : ''}>{children}</div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  )
}

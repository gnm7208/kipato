import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '../ui'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  backTo?: string
}

export function PageHeader({ eyebrow, title, description, action, backTo }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="flex flex-col gap-4 border-b-2 border-ink pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        {backTo ? <IconButton label="Back" onClick={() => navigate(backTo)} size="sm"><ArrowLeft aria-hidden="true" size={18} strokeWidth={2.5} /></IconButton> : null}
        <div>
          {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">{eyebrow}</p> : null}
          <h1 className="font-display text-3xl font-bold leading-none tracking-[-0.055em] md:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

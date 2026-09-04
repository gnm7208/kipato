import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`border-2 border-dashed border-muted bg-paper px-5 py-10 text-center ${className}`}>
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-ink bg-sun">{icon}</div> : null}
      <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

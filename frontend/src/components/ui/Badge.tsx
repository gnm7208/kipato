import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'sun' | 'jade' | 'ink' | 'muted' | 'danger'
  className?: string
}

export function Badge({ children, tone = 'muted', className = '' }: BadgeProps) {
  const tones = {
    sun: 'bg-sun text-ink',
    jade: 'bg-jade text-ink',
    ink: 'bg-ink text-paper',
    muted: 'bg-soft-line text-ink',
    danger: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex items-center gap-1 border-2 border-ink px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.09em] ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

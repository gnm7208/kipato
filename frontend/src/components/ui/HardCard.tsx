import type { ReactNode } from 'react'

export type CardTone = 'paper' | 'ink' | 'sun' | 'jade' | 'none'

interface HardCardProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
  shadow?: 'ink' | 'sun' | 'none'
  tone?: CardTone
}

// Background and text travel together, and they belong here rather than in a
// caller's `className`: Tailwind emits every utility at the same specificity, so
// a `bg-ink` passed in from outside loses to this component's own `bg-paper`
// depending only on CSS order — which is how the dashboard total once ended up
// white on white.
const toneClasses: Record<CardTone, string> = {
  paper: 'bg-paper text-ink',
  ink: 'bg-ink text-paper',
  sun: 'bg-sun text-ink',
  jade: 'bg-jade text-ink',
  none: '',
}

export function HardCard({
  children,
  className = '',
  as = 'div',
  shadow = 'ink',
  tone = 'paper',
}: HardCardProps) {
  const Component = as
  const shadowClass = shadow === 'sun' ? 'shadow-hard-sun' : shadow === 'ink' ? 'shadow-hard' : ''

  return (
    <Component className={`border-3 border-ink ${toneClasses[tone]} ${shadowClass} ${className}`}>
      {children}
    </Component>
  )
}

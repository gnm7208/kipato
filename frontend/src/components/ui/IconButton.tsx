import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
  variant?: 'paper' | 'sun' | 'ink'
  size?: 'sm' | 'md'
}

export function IconButton({ label, children, variant = 'paper', size = 'md', className = '', ...props }: IconButtonProps) {
  const sizes = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11'
  const colors = {
    paper: 'bg-paper text-ink',
    sun: 'bg-sun text-ink',
    ink: 'bg-ink text-paper',
  }

  return (
    <button
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center border-3 border-ink shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${sizes} ${colors[variant]} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

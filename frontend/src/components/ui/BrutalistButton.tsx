import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface BrutalistButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'sun' | 'ink' | 'outline' | 'ghost' | 'jade'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  className?: string
}

export function BrutalistButton({
  children,
  variant = 'sun',
  size = 'md',
  icon,
  className = '',
  type = 'button',
  ...props
}: BrutalistButtonProps) {
  const variants = {
    sun: 'bg-sun text-ink',
    ink: 'bg-ink text-paper',
    outline: 'bg-paper text-ink',
    ghost: 'border-transparent bg-transparent text-ink shadow-none',
    jade: 'bg-jade text-ink',
  }
  const sizes = {
    sm: 'min-h-10 px-3 text-xs',
    md: 'min-h-12 px-4 text-sm',
    lg: 'min-h-14 px-5 text-base',
  }
  const outline = variant === 'ghost' ? '' : 'border-3 border-ink'
  const shadow = variant === 'ghost' ? '' : 'shadow-hard'

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-display font-bold transition-[transform,box-shadow] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-55 ${outline} ${shadow} ${variants[variant]} ${sizes[size]} ${className}`}
      type={type}
      {...props}
    >
      {children}
      {icon}
    </button>
  )
}

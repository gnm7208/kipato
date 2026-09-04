import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function Field({ id, label, error, hint, required, children }: FieldProps) {
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted" htmlFor={id}>
        {label} {required ? <span className="text-jade">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted" id={helpId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="text-xs font-semibold text-red-700" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function fieldDescribedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-help`
  return undefined
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-12 w-full border-2 border-ink bg-paper px-3 text-sm font-semibold text-ink placeholder:text-muted/70 ${props.className ?? ''}`}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-32 w-full resize-y border-2 border-ink bg-paper px-3 py-3 text-sm font-semibold text-ink placeholder:text-muted/70 ${props.className ?? ''}`}
    />
  )
}

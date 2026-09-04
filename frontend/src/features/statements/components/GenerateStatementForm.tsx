import { useState, type FormEvent } from 'react'
import { BrutalistButton, Field, TextInput } from '../../../components/ui'
import { toDateKey } from '../../../lib/analytics'

interface GenerateStatementFormProps {
  pending?: boolean
  onGenerate: (payload: { start_date: string; end_date: string }) => Promise<void>
}

export function GenerateStatementForm({ pending = false, onGenerate }: GenerateStatementFormProps) {
  const today = toDateKey(new Date())
  const [startDate, setStartDate] = useState(toDateKey(new Date(Date.now() - 6 * 86_400_000)))
  const [endDate, setEndDate] = useState(today)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!startDate || !endDate) {
      setError('Choose both dates.')
      return
    }
    if (startDate > endDate) {
      setError('Start date must be before end date.')
      return
    }
    setError('')
    await onGenerate({ start_date: startDate, end_date: endDate })
  }

  return (
    <form className="border-2 border-ink bg-sun/20 p-4" onSubmit={submit}>
      <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">New proof</p><h2 className="mt-1 font-display text-xl font-bold">Generate statement</h2><p className="mt-1 text-sm text-muted">Choose a period and turn your records into something you can hand over.</p></div>
      {error ? <p aria-live="polite" className="mb-4 border-l-3 border-red-700 pl-3 text-sm font-semibold text-red-800">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2"><Field id="statement-start" label="From" required><TextInput id="statement-start" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></Field><Field id="statement-end" label="To" required><TextInput id="statement-end" max={today} onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} /></Field></div>
      <BrutalistButton className="mt-4" disabled={pending} type="submit" variant="ink">{pending ? 'Generating…' : 'Generate statement'}</BrutalistButton>
    </form>
  )
}

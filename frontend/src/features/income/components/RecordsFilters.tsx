import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BrutalistButton, Field, TextInput } from '../../../components/ui'

interface RecordsFiltersProps {
  startDate: string
  endDate: string
  onApply: (filters: { startDate: string; endDate: string }) => void
}

export function RecordsFilters({ startDate, endDate, onApply }: RecordsFiltersProps) {
  const [draftStartDate, setDraftStartDate] = useState(startDate)
  const [draftEndDate, setDraftEndDate] = useState(endDate)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onApply({ startDate: draftStartDate, endDate: draftEndDate })
  }

  const reset = () => {
    setDraftStartDate('')
    setDraftEndDate('')
    onApply({ startDate: '', endDate: '' })
  }

  return (
    <form className="border-2 border-ink bg-paper p-4" onSubmit={submit}>
      <div className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.1em]"><SlidersHorizontal aria-hidden="true" size={17} /> Filter records</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="records-start-date" label="Start date">
          <TextInput id="records-start-date" onChange={(event) => setDraftStartDate(event.target.value)} type="date" value={draftStartDate} />
        </Field>
        <Field id="records-end-date" label="End date">
          <TextInput id="records-end-date" onChange={(event) => setDraftEndDate(event.target.value)} type="date" value={draftEndDate} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <BrutalistButton size="sm" type="submit" variant="ink">Apply filters</BrutalistButton>
        <BrutalistButton icon={<RotateCcw aria-hidden="true" size={15} />} onClick={reset} size="sm" type="button" variant="outline">Reset</BrutalistButton>
      </div>
    </form>
  )
}

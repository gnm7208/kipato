import { useEffect, useState, type FormEvent } from 'react'
import { BottomSheet, BrutalistButton, Field, SegmentedControl, TextInput } from '../../../components/ui'
import { ApiError } from '../../../lib/http'
import type { IncomeEntry, IncomeMethod } from '../../../types'

interface EditIncomeDialogProps {
  entry: IncomeEntry | null
  pending?: boolean
  onClose: () => void
  onSave: (payload: { amount: number; date: string; method: IncomeMethod; note: string }) => Promise<void>
}

export function EditIncomeDialog({ entry, pending = false, onClose, onSave }: EditIncomeDialogProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [method, setMethod] = useState<IncomeMethod>('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!entry) return
    setAmount(String(entry.amount))
    setDate(entry.date)
    setMethod(entry.method)
    setNote(entry.note ?? '')
    setError('')
  }, [entry])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number(amount.replaceAll(',', ''))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!date) {
      setError('Choose a date.')
      return
    }
    try {
      await onSave({ amount: parsedAmount, date, method, note: note.trim() })
    } catch (saveError: unknown) {
      setError(saveError instanceof ApiError ? saveError.message : 'Could not update this record.')
    }
  }

  return (
    <BottomSheet eyebrow="Edit record" onClose={onClose} open={Boolean(entry)} title="Update income">
      <form className="space-y-5" id="edit-income-form" onSubmit={submit}>
        <Field error={error} id="edit-amount" label="Amount" required><TextInput id="edit-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /></Field>
        <Field id="edit-date" label="Date" required><TextInput id="edit-date" onChange={(event) => setDate(event.target.value)} type="date" value={date} /></Field>
        <SegmentedControl label="Method" onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-PESA' }]} value={method} />
        <Field id="edit-note" label="Note"><TextInput id="edit-note" maxLength={255} onChange={(event) => setNote(event.target.value)} value={note} /></Field>
        <BrutalistButton className="w-full" disabled={pending} form="edit-income-form" type="submit" variant="sun">{pending ? 'Saving…' : 'Save changes'}</BrutalistButton>
      </form>
    </BottomSheet>
  )
}

import { useQueryClient } from '@tanstack/react-query'
import { Check, CloudOff, LoaderCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useCreateIncomeEntry, queryKeys } from '../../../data/hooks'
import { useToast } from '../../../components/feedback'
import { BottomSheet, BrutalistButton, Field, SegmentedControl, TextInput } from '../../../components/ui'
import { toDateKey } from '../../../lib/analytics'
import { ApiError } from '../../../lib/http'
import type { IncomeMethod } from '../../../types'

const quickNotes = ['Transport', 'Sales', 'Labour', 'Other']

interface IncomeEntrySheetProps {
  open: boolean
  onClose: () => void
}

export function IncomeEntrySheet({ open, onClose }: IncomeEntrySheetProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const mutation = useCreateIncomeEntry()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toDateKey(new Date()))
  const [method, setMethod] = useState<IncomeMethod>('cash')
  const [note, setNote] = useState('')
  const [selectedNote, setSelectedNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount('')
    setDate(toDateKey(new Date()))
    setMethod('cash')
    setNote('')
    setSelectedNote('')
    setError('')
  }, [open])

  const selectQuickNote = (quickNote: string) => {
    setSelectedNote(quickNote)
    setNote(quickNote)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedAmount = Number(amount.replaceAll(',', ''))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Choose a valid date.')
      return
    }
    if (note.length > 255) {
      setError('Keep your note under 255 characters.')
      return
    }

    setError('')
    try {
      const saved = await mutation.mutateAsync({ amount: parsedAmount, date, method, note: note.trim() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.entries({}) })
      await queryClient.invalidateQueries({ queryKey: ['income'] })
      // An entry logged with no signal is real to the worker, but saying it is
      // "saved" would overstate it until the server has it.
      showToast(saved.sync_status === 'pending'
        ? { title: 'Saved on this phone', description: 'No signal right now. Kipato will sync it as soon as you are back online.', variant: 'info' }
        : { title: 'Record saved', description: 'Your income is now part of your Kipato record.', variant: 'success' })
      onClose()
    } catch (mutationError: unknown) {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Could not save this record. Try again.')
    }
  }

  return (
    <BottomSheet
      eyebrow="Quick record"
      footer={<BrutalistButton className="w-full justify-between" disabled={mutation.isPending} size="lg" type="submit" form="income-entry-form" variant="sun">{mutation.isPending ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={20} /> Saving…</> : <>Save record <span aria-hidden="true" className="border-2 border-ink px-2 py-0.5">↗</span></>}</BrutalistButton>}
      onClose={onClose}
      open={open}
      title="Log income"
    >
      <form className="space-y-5" id="income-entry-form" onSubmit={handleSubmit}>
        <Field error={error} id="income-amount" label="Amount" required>
          <div className="flex items-baseline gap-2 border-y-3 border-ink py-3">
            <span className="font-display text-lg font-bold text-muted">KSh</span>
            <input aria-describedby={error ? 'income-amount-error' : undefined} aria-invalid={Boolean(error)} autoFocus className="min-w-0 flex-1 bg-transparent p-0 font-display text-6xl font-bold leading-none tracking-[-0.1em] outline-hidden" id="income-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="0" value={amount} />
          </div>
        </Field>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Quick note</p>
            <span className="text-xs text-muted">Prefills your note</span>
          </div>
          <div aria-label="Quick note choices" className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {quickNotes.map((quickNote) => (
              <button aria-pressed={selectedNote === quickNote} className={`min-h-11 shrink-0 border-2 border-ink px-4 text-xs font-bold ${selectedNote === quickNote ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-sun/35'}`} key={quickNote} onClick={() => selectQuickNote(quickNote)} type="button">{quickNote}</button>
            ))}
          </div>
        </div>
        <Field id="income-date" label="Date" required>
          <TextInput id="income-date" max={toDateKey(new Date())} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </Field>
        <SegmentedControl label="Method" onChange={setMethod} options={[{ value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-PESA' }]} value={method} />
        <Field hint="Optional — add a quick description for your record." id="income-note" label="Note">
          <TextInput id="income-note" maxLength={255} onChange={(event) => setNote(event.target.value)} placeholder="What was this for?" value={note} />
        </Field>
        <div className="flex items-center gap-2 border-t-2 border-ink/15 pt-3 text-xs font-semibold text-muted">
          <CloudOff aria-hidden="true" className="text-jade" size={18} />
          <span>Saved on this device when offline</span>
          <Check aria-hidden="true" className="ml-auto text-jade" size={17} />
        </div>
      </form>
    </BottomSheet>
  )
}

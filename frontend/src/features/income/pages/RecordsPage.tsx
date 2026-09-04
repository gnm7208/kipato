import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InlineAlert, useToast } from '../../../components/feedback'
import { BrutalistButton, ConfirmDialog, EmptyState, LoadingState, Pagination } from '../../../components/ui'
import { useDeleteIncomeEntry, useIncomeEntries, useUpdateIncomeEntry } from '../../../data/hooks'
import { ApiError } from '../../../lib/http'
import type { IncomeEntry, IncomeMethod } from '../../../types'
import { PageHeader } from '../../../components/layout'
import { IncomeEntrySheet } from '../components/IncomeEntrySheet'
import { EditIncomeDialog } from '../components/EditIncomeDialog'
import { IncomeTable } from '../components/IncomeTable'
import { RecordsFilters } from '../components/RecordsFilters'

export function RecordsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [filters, setFilters] = useState({ startDate: '', endDate: '' })
  const [page, setPage] = useState(1)
  const [isSheetOpen, setSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<IncomeEntry | null>(null)
  const query = useIncomeEntries({ startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, page, perPage: 8 })
  const updateMutation = useUpdateIncomeEntry()
  const deleteMutation = useDeleteIncomeEntry()

  const applyFilters = (nextFilters: { startDate: string; endDate: string }) => {
    if (nextFilters.startDate && nextFilters.endDate && nextFilters.startDate > nextFilters.endDate) {
      showToast({ title: 'Check the date range', description: 'Start date must be before end date.', variant: 'warning' })
      return
    }
    setFilters(nextFilters)
    setPage(1)
  }

  const saveEdit = async (payload: { amount: number; date: string; method: IncomeMethod; note: string }) => {
    if (!editingEntry) return
    await updateMutation.mutateAsync({ id: editingEntry.id, payload })
    await queryClient.invalidateQueries({ queryKey: ['income'] })
    showToast({ title: 'Record updated', description: 'Your changes are saved.', variant: 'success' })
    setEditingEntry(null)
  }

  const confirmDelete = async () => {
    if (!deletingEntry) return
    try {
      await deleteMutation.mutateAsync(deletingEntry.id)
      await queryClient.invalidateQueries({ queryKey: ['income'] })
      showToast({ title: 'Record deleted', description: 'The income entry was removed.', variant: 'success' })
      setDeletingEntry(null)
    } catch (error: unknown) {
      showToast({ title: 'Could not delete record', description: error instanceof ApiError ? error.message : 'Try again.', variant: 'error' })
    }
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader action={<BrutalistButton icon={<Plus aria-hidden="true" size={18} />} onClick={() => setSheetOpen(true)} size="sm" variant="sun">Log cash</BrutalistButton>} description="Every entry makes your income easier to show and trust." eyebrow="Your record" title="Income records" />
        <RecordsFilters endDate={filters.endDate} onApply={applyFilters} startDate={filters.startDate} />
        {query.isPending ? <LoadingState label="Loading your records" /> : query.error ? <InlineAlert title="Records are unavailable." action={<BrutalistButton onClick={() => void query.refetch()} size="sm" variant="outline">Try again</BrutalistButton>}>Check your connection and retry.</InlineAlert> : query.data?.entries.length === 0 ? <EmptyState description="Try a different date range or log new income." title="No records in this period" action={<BrutalistButton onClick={() => setSheetOpen(true)} icon={<Plus aria-hidden="true" size={17} />} variant="sun">Log cash</BrutalistButton>} /> : (
          <section aria-labelledby="results-title" className="space-y-4">
            <div className="flex items-baseline justify-between gap-3"><h2 className="font-display text-xl font-bold" id="results-title">{query.data?.total ?? 0} records</h2><button className="text-xs font-bold underline decoration-2 underline-offset-4" onClick={() => navigate('/app/trends')} type="button">See trends</button></div>
            <IncomeTable entries={query.data?.entries ?? []} onDelete={setDeletingEntry} onEdit={setEditingEntry} />
            <Pagination onChange={setPage} page={query.data?.page ?? 1} pages={query.data?.pages ?? 1} />
          </section>
        )}
      </div>
      <IncomeEntrySheet onClose={() => setSheetOpen(false)} open={isSheetOpen} />
      <EditIncomeDialog entry={editingEntry} onClose={() => setEditingEntry(null)} onSave={saveEdit} pending={updateMutation.isPending} />
      <ConfirmDialog confirmLabel="Delete record" description="This will remove the income entry from your worker record. This cannot be undone." onClose={() => setDeletingEntry(null)} onConfirm={() => void confirmDelete()} open={Boolean(deletingEntry)} pending={deleteMutation.isPending} title="Delete this record?" />
    </>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InlineAlert } from '../../../components/feedback'
import { LoadingState, BrutalistButton } from '../../../components/ui'
import { useIncomeEntries, useIncomeTrends } from '../../../data/hooks'
import { getPeriodComparison, getReferenceDate } from '../../../lib/analytics'
import { useAuth } from '../../auth/auth-context'
import { EarningsHero } from '../components/EarningsHero'
import { IncomeEntrySheet } from '../../income/components/IncomeEntrySheet'
import { QuickActions } from '../components/QuickActions'
import { RecentActivity } from '../components/RecentActivity'
import { ShieldCheck } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSheetOpen, setSheetOpen] = useState(false)
  const entriesQuery = useIncomeEntries({ page: 1, perPage: 100 })
  const trendsQuery = useIncomeTrends()
  const entries = entriesQuery.data?.entries ?? []
  const referenceDate = trendsQuery.data ? Object.keys(trendsQuery.data.daily_breakdown).sort().at(-1) ?? getReferenceDate(entries) : getReferenceDate(entries)
  const isLoading = entriesQuery.isPending || trendsQuery.isPending
  const error = entriesQuery.error ?? trendsQuery.error

  if (isLoading) return <LoadingState label="Opening your record" />
  if (error || !trendsQuery.data) {
    return <InlineAlert title="We couldn't load your record." action={<BrutalistButton onClick={() => { void entriesQuery.refetch(); void trendsQuery.refetch() }} size="sm" variant="outline">Try again</BrutalistButton>}>Your saved records are safe. Check your connection and retry.</InlineAlert>
  }

  const comparison = getPeriodComparison(entries, referenceDate)

  return (
    <>
      <div className="space-y-7">
        <section aria-labelledby="greeting-title">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">{new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</p>
          <h1 className="font-display text-[clamp(2.6rem,11vw,4.3rem)] font-bold leading-[0.92] tracking-[-0.07em]" id="greeting-title">Good morning,<br /><span className="text-jade">{user?.full_name.split(' ')[0]}.</span></h1>
          <p className="mt-3 text-base font-medium text-muted">Keep your record moving.</p>
        </section>
        <EarningsHero comparison={comparison} entryCount={entries.length} />
        <QuickActions onLogCash={() => setSheetOpen(true)} />
        <RecentActivity entries={entries} />
        <div className="flex items-center justify-between gap-3 border-2 border-ink bg-paper px-3 py-3.5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center bg-jade text-ink"><ShieldCheck size={17} /></span>
            <div><p className="text-sm font-bold">Ready to record offline</p><p className="text-xs text-muted">Your record stays worker-owned.</p></div>
          </div>
          <button className="min-h-11 px-2 text-xs font-bold underline decoration-2 underline-offset-4" onClick={() => navigate('/app/profile')} type="button">Profile</button>
        </div>
      </div>
      <IncomeEntrySheet onClose={() => setSheetOpen(false)} open={isSheetOpen} />
    </>
  )
}

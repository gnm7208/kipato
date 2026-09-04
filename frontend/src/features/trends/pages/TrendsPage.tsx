import { BarChart3 } from 'lucide-react'
import { InlineAlert } from '../../../components/feedback'
import { EmptyState, BrutalistButton, LoadingState } from '../../../components/ui'
import { useIncomeEntries, useIncomeTrends } from '../../../data/hooks'
import { getBestDay, getConsistencyScore, getReferenceDate, getTrendPoints } from '../../../lib/analytics'
import { PageHeader } from '../../../components/layout'
import { ConsistencyGauge } from '../components/ConsistencyGauge'
import { IncomeBarChart } from '../components/IncomeBarChart'
import { MetricCluster } from '../components/MetricCluster'

export function TrendsPage() {
  const trendsQuery = useIncomeTrends()
  const entriesQuery = useIncomeEntries({ page: 1, perPage: 100 })
  const isLoading = trendsQuery.isPending || entriesQuery.isPending
  const error = trendsQuery.error ?? entriesQuery.error

  if (isLoading) return <LoadingState label="Building your trends" />
  if (error || !trendsQuery.data) return <InlineAlert title="Trends are unavailable." action={<BrutalistButton onClick={() => { void trendsQuery.refetch(); void entriesQuery.refetch() }} size="sm" variant="outline">Try again</BrutalistButton>}>Check your connection and retry.</InlineAlert>

  const entries = entriesQuery.data?.entries ?? []
  const referenceDate = getReferenceDate(entries, new Date())
  const hasData = trendsQuery.data.entry_count > 0
  const points = getTrendPoints(trendsQuery.data, referenceDate)
  const bestDay = getBestDay(trendsQuery.data.daily_breakdown)
  const consistency = getConsistencyScore(entries, referenceDate)

  return (
    <div className="space-y-7">
      <PageHeader description="See the shape of your work and how consistently your record is growing." eyebrow="Evidence, not estimates" title="Income trends" />
      {!hasData ? <EmptyState description="Log income for a few days and your pattern will start to appear here." icon={<BarChart3 aria-hidden="true" size={22} />} title="No trend data yet" action={<BrutalistButton onClick={() => window.location.assign('/app')} variant="sun">Log your first record</BrutalistButton>} /> : <><IncomeBarChart points={points} /><MetricCluster average={trendsQuery.data.average_daily} bestDay={bestDay} entryCount={trendsQuery.data.entry_count} /><ConsistencyGauge score={consistency} /></>}
    </div>
  )
}

import { formatKsh } from '../../../lib/formatters'
import type { BestDay } from '../../../lib/analytics'

interface MetricClusterProps {
  average: number
  bestDay: BestDay | null
  entryCount: number
}

export function MetricCluster({ average, bestDay, entryCount }: MetricClusterProps) {
  return (
    <section aria-labelledby="metric-cluster-title">
      <p className="sr-only" id="metric-cluster-title">Income summary metrics</p>
      <div className="grid min-h-40 grid-cols-12 gap-2">
        <div className="col-span-7 flex flex-col justify-between border-3 border-ink bg-jade/15 p-3"><span className="max-w-[10rem] text-xs font-bold uppercase leading-tight tracking-[0.08em]">Average daily income</span><div><span className="font-display text-2xl font-bold tracking-[-0.05em]">{formatKsh(average)}</span><div className="mt-2 h-1.5 w-16 bg-jade" /></div></div>
        <div className="col-span-3 flex flex-col justify-between border-3 border-ink bg-sun/45 p-3"><span className="text-[0.68rem] font-bold uppercase leading-tight tracking-[0.08em]">Best day</span><div><span className="block truncate font-display text-base font-bold">{bestDay?.label ?? '—'}</span><div className="mt-2 h-1.5 w-9 bg-ink" /></div></div>
        <div className="col-span-2 flex flex-col justify-between border-3 border-ink bg-paper p-2"><span className="text-[0.6rem] font-bold uppercase leading-tight tracking-[0.04em]">Total entries</span><div><span className="font-display text-2xl font-bold leading-none">{entryCount}</span><div className="mt-2 h-1.5 w-5 bg-ink" /></div></div>
      </div>
    </section>
  )
}

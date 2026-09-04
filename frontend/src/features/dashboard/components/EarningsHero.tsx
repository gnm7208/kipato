import { TrendingUp } from 'lucide-react'
import { Badge, HardCard } from '../../../components/ui'
import { formatEntriesCount, formatKsh, formatPercentage } from '../../../lib/formatters'
import type { PeriodComparison } from '../../../lib/analytics'

interface EarningsHeroProps {
  comparison: PeriodComparison
  entryCount: number
}

export function EarningsHero({ comparison, entryCount }: EarningsHeroProps) {
  const isPositive = comparison.deltaPercent === null || comparison.deltaPercent >= 0

  return (
    <HardCard as="section" className="relative overflow-hidden p-5" shadow="sun" tone="ink">
      <div aria-hidden="true" className="absolute right-0 top-0 h-16 w-16 bg-sun" />
      <div className="relative flex items-start justify-between gap-4">
        <p className="pt-1 text-xs font-bold uppercase tracking-[0.16em] text-paper/65">This week's earnings</p>
        <Badge className="border-ink shadow-[2px_2px_0_var(--color-canvas)]" tone={isPositive ? 'jade' : 'danger'}>
          {comparison.deltaPercent === null ? 'New' : <><TrendingUp aria-hidden="true" size={13} /> {formatPercentage(comparison.deltaPercent)}</>}
        </Badge>
      </div>
      <p className="relative mt-7 break-words font-display text-[clamp(2.7rem,12vw,4.4rem)] font-bold leading-none tracking-[-0.08em]">{formatKsh(comparison.currentTotal)}</p>
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paper/25 pt-3 text-xs text-paper/70">
        <span>{comparison.deltaPercent === null ? 'First week on record' : 'vs previous 7 days'}</span>
        <span className="font-semibold text-jade">{formatEntriesCount(entryCount)} logged</span>
      </div>
    </HardCard>
  )
}

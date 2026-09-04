import { Check } from 'lucide-react'
import { HardCard } from '../../../components/ui'
import type { ConsistencyScore } from '../../../lib/analytics'

export function ConsistencyGauge({ score }: { score: ConsistencyScore }) {
  const dash = Math.max(0, Math.min(157, 157 * (score.percentage / 100)))

  return (
    <HardCard className="flex items-center gap-4 px-4 py-4" shadow="ink" tone="ink">
      <svg aria-label={`${score.percentage}% consistency, ${score.loggedDays} of ${score.totalDays} days logged`} className="h-16 w-24 shrink-0" role="img" viewBox="0 0 120 70">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="rgba(250,250,250,.22)" strokeWidth="8" />
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--color-jade)" strokeDasharray={`${dash} 157`} strokeLinecap="butt" strokeWidth="8" />
        <text fill="var(--color-paper)" fontFamily="Space Grotesk, sans-serif" fontSize="17" fontWeight="700" textAnchor="middle" x="60" y="56">{score.percentage}%</text>
      </svg>
      <div className="min-w-0"><p className="flex items-center gap-2 font-display text-base font-bold"><Check aria-hidden="true" className="text-jade" size={16} /> Logging consistency</p><p className="mt-1 text-xs text-paper/65">{score.loggedDays} of {score.totalDays} days logged</p><p className="mt-1 text-[0.68rem] text-paper/50">Trailing 7-day window</p></div>
    </HardCard>
  )
}

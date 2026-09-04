import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HardCard } from '../../../components/ui'
import { formatKsh } from '../../../lib/formatters'
import type { TrendPoint } from '../../../lib/analytics'

export function IncomeBarChart({ points }: { points: TrendPoint[] }) {
  return (
    <HardCard as="section" className="p-4" shadow="ink">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Daily income</p><p className="font-display text-sm font-bold">Last 7 days</p></div>
      <div aria-label="Bar chart showing daily income for the last seven days" className="h-64 w-full" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={points} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-soft-line)" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={{ stroke: 'var(--color-ink)', strokeWidth: 2 }} dataKey="shortLabel" tick={{ fill: 'var(--color-muted)', fontSize: 11, fontWeight: 700 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickFormatter={(value: number) => value >= 1000 ? `${value / 1000}k` : String(value)} tickLine={false} width={42} />
            <Tooltip contentStyle={{ border: '2px solid var(--color-ink)', borderRadius: 0, boxShadow: '3px 3px 0 var(--color-ink)', fontFamily: 'DM Sans', fontSize: 12 }} cursor={{ fill: 'var(--color-sun)', opacity: 0.18 }} formatter={(value) => [formatKsh(Number(value)), 'Income']} labelFormatter={(label, payload) => payload[0]?.payload?.label ?? label} />
            <Bar dataKey="amount" maxBarSize={42} radius={[0, 0, 0, 0]}>
              {points.map((point, index) => <Cell fill={index === points.length - 1 ? 'var(--color-sun)' : 'var(--color-ink)'} key={point.date} stroke="var(--color-ink)" strokeWidth={2} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 border-t-2 border-ink pt-3" aria-label="Income values by day">
        {points.map((point) => <div className="min-w-0 text-center" key={point.date}><p className="truncate text-[0.62rem] font-bold uppercase text-muted">{point.label.split(' ')[0]}</p><p className="mt-1 truncate font-display text-[0.68rem] font-bold">{formatKsh(point.amount).replace('KSh ', '')}</p></div>)}
      </div>
    </HardCard>
  )
}

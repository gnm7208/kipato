import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, MoveUpRight, Printer, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { HardCard, LoadingState } from '../../../components/ui'
import { fetchSharedStatement } from '../../../data/api/statementsApi'
import { ApiError } from '../../../lib/http'
import { formatDate, formatKsh, formatMethod, formatPhone } from '../../../lib/formatters'

/**
 * What a SACCO or lender sees. No account, no app — just the proof the worker
 * chose to hand over, and nothing else about their account.
 */
export function SharedStatementPage() {
  const { token } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-statement', token],
    queryFn: () => fetchSharedStatement(token ?? ''),
    enabled: Boolean(token),
    retry: false,
  })

  if (isLoading) return <LoadingState label="Opening this income statement" />

  if (error) {
    const expired = error instanceof ApiError && error.status === 410
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <HardCard className="p-6 text-center" shadow="ink">
          <h1 className="font-display text-2xl font-bold">
            {expired ? 'This link has expired' : 'This link is not valid'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {expired
              ? 'The worker set this statement to stop being viewable. Ask them for a fresh link.'
              : 'It may have been revoked by the worker, or the address may be mistyped.'}
          </p>
        </HardCard>
      </div>
    )
  }

  if (!data) return null

  const { statement, worker, entries } = data

  return (
    <div className="min-h-svh bg-canvas text-ink">
      <header className="border-b-3 border-ink bg-canvas print-hidden">
        <div className="mx-auto flex min-h-18 max-w-3xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center border-3 border-ink bg-ink text-sun">
              <MoveUpRight size={17} strokeWidth={3} />
            </span>
            <span className="font-display text-lg font-bold tracking-[0.16em]">KIPATO</span>
          </div>
          <button
            className="inline-flex min-h-11 items-center gap-2 border-3 border-ink bg-sun px-3 font-display text-sm font-bold shadow-[3px_3px_0_var(--color-ink)]"
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" size={17} /> Print / Save PDF
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Verified income statement</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-none tracking-[-0.055em] md:text-4xl">
          {worker.full_name}
        </h1>
        <p className="mt-2 text-sm text-muted">{formatPhone(worker.phone)}</p>

        <HardCard as="section" className="mt-6 overflow-hidden p-5" shadow="sun" tone="ink">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-paper/65">
            Income recorded, {formatDate(statement.start_date)} — {formatDate(statement.end_date)}
          </p>
          <p className="mt-5 break-words font-display text-[clamp(2.4rem,11vw,4rem)] font-bold leading-none tracking-[-0.08em]">
            {formatKsh(statement.total_income)}
          </p>
          <p className="mt-4 border-t border-paper/25 pt-3 text-xs text-paper/70">
            Across {statement.entry_count} {statement.entry_count === 1 ? 'record' : 'records'}
          </p>
        </HardCard>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <Fact
            icon={<CalendarDays aria-hidden="true" size={18} />}
            label="Recording since"
            value={worker.member_since ? formatDate(worker.member_since) : '—'}
          />
          <Fact
            icon={<BadgeCheck aria-hidden="true" size={18} />}
            label="Statement generated"
            value={statement.generated_at ? formatDate(statement.generated_at) : '—'}
          />
          <Fact
            icon={<ShieldCheck aria-hidden="true" size={18} />}
            label="Link valid until"
            value={statement.expires_at ? formatDate(statement.expires_at) : 'No expiry'}
          />
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Every record in this period</h2>
          <div className="mt-3 overflow-x-auto border-y-3 border-ink bg-paper">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">Date</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">Detail</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">Method</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr className="border-b-2 border-ink/10 last:border-b-0" key={`${entry.date}-${index}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-muted">{entry.note || 'Income record'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatMethod(entry.method)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-display font-bold">
                      {formatKsh(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 border-t-2 border-ink/15 pt-4 text-xs leading-5 text-muted">
          Shared by the worker from their own Kipato record. Kipato stores what the worker logged
          and what their M-PESA messages confirmed; it does not vouch for entries logged as cash.
        </p>
      </main>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <HardCard className="p-4" shadow="none">
      <span className="text-muted">{icon}</span>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </HardCard>
  )
}

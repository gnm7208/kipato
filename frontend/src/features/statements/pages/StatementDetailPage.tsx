import { ArrowLeft } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { InlineAlert, useToast } from '../../../components/feedback'
import { BrutalistButton, LoadingState } from '../../../components/ui'
import { PageHeader } from '../../../components/layout'
import { useStatement } from '../../../data/hooks'
import { useAuth } from '../../auth/auth-context'
import { StatementActions } from '../components/StatementActions'
import { StatementTicket } from '../components/StatementTicket'

export function StatementDetailPage() {
  const { statementId } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const parsedId = statementId ? Number(statementId) : undefined
  const query = useStatement(Number.isFinite(parsedId) ? parsedId : undefined)

  if (query.isPending) return <LoadingState label="Preparing your statement" />
  if (query.error || !query.data || !user) return <InlineAlert title="Statement not found." action={<BrutalistButton onClick={() => window.history.back()} icon={<ArrowLeft aria-hidden="true" size={16} />} size="sm" variant="outline">Back to statements</BrutalistButton>}>Generate a new statement from your income records.</InlineAlert>

  return <div className="print-area mx-auto max-w-2xl space-y-6"><PageHeader backTo="/app/statements" description="A print-ready snapshot of the records in this period." eyebrow="Ready to hand over" title="Verified statement" action={<span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-jade">Verified</span>} /><StatementTicket statement={query.data} user={user} /><StatementActions statement={query.data} /><p className="print-hidden flex items-center justify-center gap-2 text-center text-xs font-semibold text-muted">Worker-owned record · Generated {new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(query.data.generated_at))}<button className="sr-only" onClick={() => showToast({ title: 'This record is worker-owned', variant: 'info' })} type="button">Show record ownership information</button></p></div>
}

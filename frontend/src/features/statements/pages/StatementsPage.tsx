import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { InlineAlert, useToast } from '../../../components/feedback'
import { LoadingState } from '../../../components/ui'
import { PageHeader } from '../../../components/layout'
import { useCreateStatement, useStatements } from '../../../data/hooks'
import { queryKeys } from '../../../data/hooks'
import { ApiError } from '../../../lib/http'
import { GenerateStatementForm } from '../components/GenerateStatementForm'
import { StatementList } from '../components/StatementList'

export function StatementsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const statementsQuery = useStatements()
  const createMutation = useCreateStatement()

  const generate = async (payload: { start_date: string; end_date: string }) => {
    try {
      const statement = await createMutation.mutateAsync(payload)
      await queryClient.invalidateQueries({ queryKey: queryKeys.statements })
      showToast({ title: 'Statement generated', description: 'Your proof is ready to review.', variant: 'success' })
      navigate(`/app/statements/${statement.id}`)
    } catch (error: unknown) {
      showToast({ title: 'Could not generate statement', description: error instanceof ApiError ? error.message : 'Try again.', variant: 'error' })
    }
  }

  if (statementsQuery.isPending) return <LoadingState label="Loading statements" />
  if (statementsQuery.error) return <InlineAlert title="Statements are unavailable." action={<button className="border-2 border-ink bg-paper px-3 py-2 text-xs font-bold" onClick={() => void statementsQuery.refetch()} type="button">Try again</button>}>Check your connection and retry.</InlineAlert>

  return <div className="space-y-7"><PageHeader description="Turn a date range into a clear record you can share with a SACCO or lender." eyebrow="Worker-owned proof" title="Statements" /><GenerateStatementForm onGenerate={generate} pending={createMutation.isPending} /><StatementList statements={statementsQuery.data?.statements ?? []} /></div>
}

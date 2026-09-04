import { useMutation, useQuery } from '@tanstack/react-query'
import { repository } from './repository'
import type {
  AdminWorkerQueryParams,
  EntryQueryParams,
  IncomeEntryPayload,
  LoginPayload,
  MpesaImportPayload,
  RegisterPayload,
  StatementPayload,
} from '../types'

export const queryKeys = {
  auth: ['auth', 'me'] as const,
  entries: (params: EntryQueryParams) => ['income', 'entries', params] as const,
  trends: ['income', 'trends'] as const,
  imports: ['mpesa', 'imports'] as const,
  statements: ['statements'] as const,
  statement: (id: number) => ['statements', id] as const,
  adminStats: ['admin', 'stats'] as const,
  adminWorkers: (params: AdminWorkerQueryParams) => ['admin', 'workers', params] as const,
  adminWorker: (id: number) => ['admin', 'workers', id] as const,
  adminWorkerEntries: (id: number, params: EntryQueryParams) =>
    ['admin', 'workers', id, 'entries', params] as const,
  adminWorkerStatements: (id: number) => ['admin', 'workers', id, 'statements'] as const,
}

export function useIncomeEntries(params: EntryQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.entries(params),
    queryFn: () => repository.income.listEntries(params),
  })
}

export function useIncomeTrends() {
  return useQuery({
    queryKey: queryKeys.trends,
    queryFn: repository.income.getTrends,
  })
}

export function useMpesaImports() {
  return useQuery({
    queryKey: queryKeys.imports,
    queryFn: repository.mpesa.listImports,
  })
}

export function useStatements() {
  return useQuery({
    queryKey: queryKeys.statements,
    queryFn: repository.statements.listStatements,
  })
}

export function useStatement(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.statement(id ?? 0),
    queryFn: () => repository.statements.getStatement(id ?? 0),
    enabled: id !== undefined,
  })
}

export function useLogin() {
  return useMutation({ mutationFn: (payload: LoginPayload) => repository.auth.login(payload) })
}

export function useRegister() {
  return useMutation({ mutationFn: (payload: RegisterPayload) => repository.auth.register(payload) })
}

export function useCreateIncomeEntry() {
  return useMutation({ mutationFn: (payload: IncomeEntryPayload) => repository.income.createEntry(payload) })
}

export function useUpdateIncomeEntry() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<IncomeEntryPayload> }) =>
      repository.income.updateEntry(id, payload),
  })
}

export function useDeleteIncomeEntry() {
  return useMutation({ mutationFn: (id: number) => repository.income.deleteEntry(id) })
}

export function useCreateMpesaImport() {
  return useMutation({ mutationFn: (payload: MpesaImportPayload) => repository.mpesa.createImport(payload) })
}

export function useCreateStatement() {
  return useMutation({ mutationFn: (payload: StatementPayload) => repository.statements.createStatement(payload) })
}

export function useAdminStats() {
  return useQuery({ queryKey: queryKeys.adminStats, queryFn: repository.admin.getStats })
}

export function useAdminWorkers(params: AdminWorkerQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.adminWorkers(params),
    queryFn: () => repository.admin.listWorkers(params),
  })
}

export function useAdminWorker(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.adminWorker(id ?? 0),
    queryFn: () => repository.admin.getWorker(id ?? 0),
    enabled: id !== undefined,
  })
}

export function useAdminWorkerEntries(id: number | undefined, params: EntryQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.adminWorkerEntries(id ?? 0, params),
    queryFn: () => repository.admin.listWorkerEntries(id ?? 0, params),
    enabled: id !== undefined,
  })
}

export function useAdminWorkerStatements(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.adminWorkerStatements(id ?? 0),
    queryFn: () => repository.admin.listWorkerStatements(id ?? 0),
    enabled: id !== undefined,
  })
}

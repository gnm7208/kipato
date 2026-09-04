import { adminApi } from './api/adminApi'
import { authApi } from './api/authApi'
import { incomeApi } from './api/incomeApi'
import { mpesaApi } from './api/mpesaApi'
import { statementsApi } from './api/statementsApi'
import { createMockRepository } from './mock/repository'
import type {
  AdminStats,
  AdminWorker,
  AdminWorkerQueryParams,
  AdminWorkersResponse,
  AuthResponse,
  EntriesResponse,
  EntryQueryParams,
  IncomeEntry,
  IncomeEntryPayload,
  LoginPayload,
  MessageResponse,
  MpesaImport,
  MpesaImportPayload,
  MpesaImportResult,
  RegisterPayload,
  ShareResponse,
  Statement,
  StatementDetail,
  StatementPayload,
  TrendsResponse,
  User,
} from '../types'

export interface KipatoRepository {
  auth: {
    register(payload: RegisterPayload): Promise<AuthResponse>
    login(payload: LoginPayload): Promise<AuthResponse>
    logout(): Promise<MessageResponse>
    me(): Promise<{ user: User }>
  }
  income: {
    listEntries(params?: EntryQueryParams): Promise<EntriesResponse>
    createEntry(payload: IncomeEntryPayload): Promise<IncomeEntry>
    getEntry(id: number): Promise<IncomeEntry>
    updateEntry(id: number, payload: Partial<IncomeEntryPayload>): Promise<IncomeEntry>
    deleteEntry(id: number): Promise<MessageResponse>
    getTrends(): Promise<TrendsResponse>
  }
  mpesa: {
    listImports(): Promise<{ imports: MpesaImport[] }>
    createImport(payload: MpesaImportPayload): Promise<MpesaImportResult>
  }
  statements: {
    listStatements(): Promise<{ statements: Statement[] }>
    createStatement(payload: StatementPayload): Promise<Statement>
    getStatement(id: number): Promise<StatementDetail>
    shareStatement(id: number, expiresInDays?: number): Promise<ShareResponse>
    revokeShare(id: number): Promise<{ message: string; statement: Statement }>
  }
  admin: {
    getStats(): Promise<AdminStats>
    listWorkers(params?: AdminWorkerQueryParams): Promise<AdminWorkersResponse>
    getWorker(id: number): Promise<{ worker: AdminWorker }>
    listWorkerEntries(id: number, params?: EntryQueryParams): Promise<EntriesResponse>
    listWorkerStatements(id: number): Promise<{ statements: Statement[] }>
  }
}

const dataMode = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'mock'

export const repository: KipatoRepository =
  dataMode === 'api'
    ? {
        auth: authApi,
        income: incomeApi,
        mpesa: mpesaApi,
        statements: statementsApi,
        admin: adminApi,
      }
    : createMockRepository()

export function isMockMode() {
  return dataMode === 'mock'
}

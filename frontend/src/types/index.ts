export type IncomeMethod = 'cash' | 'mpesa'
export type SyncStatus = 'synced' | 'pending' | 'failed'
export type AuthMode = 'login' | 'register'
export type AppTab = 'home' | 'trends' | 'imports' | 'statements'
export type ToastVariant = 'success' | 'info' | 'warning' | 'error'
export type DataMode = 'api' | 'mock'

export interface User {
  id: number
  phone: string
  full_name: string
  email?: string | null
  email_verified: boolean
  role: 'worker' | 'admin'
  created_at: string
}

export interface IncomeEntry {
  id: number
  worker_id: number
  amount: number
  date: string
  method: IncomeMethod
  note: string | null
  sync_status: SyncStatus
  synced_at: string | null
  created_at: string | null
  /** Present for entries that were logged offline and replayed on reconnect. */
  client_uuid?: string | null
}

/** An income entry logged with no signal, waiting in the outbox. */
export interface OutboxEntry {
  client_uuid: string
  payload: IncomeEntryPayload
  queued_at: string
  attempts: number
  last_error?: string
}

export interface EntriesResponse {
  entries: IncomeEntry[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface EntryQueryParams {
  startDate?: string
  endDate?: string
  page?: number
  perPage?: number
}

export interface TrendsResponse {
  total_income: number
  entry_count: number
  average_daily: number
  daily_breakdown: Record<string, number>
}

export interface MpesaImport {
  id: number
  worker_id: number
  source_ref: string
  file_name: string | null
  entries_count: number
  imported_at: string
}

export interface SharedStatement {
  statement: {
    start_date: string
    end_date: string
    total_income: number
    entry_count: number
    generated_at: string | null
    expires_at: string | null
  }
  worker: {
    full_name: string
    phone: string
    member_since: string | null
  }
  entries: Array<{
    date: string
    amount: number
    method: IncomeMethod
    note: string | null
  }>
}

export interface ShareResponse {
  message: string
  statement: Statement
  share_path: string
}

export interface Statement {
  id: number
  worker_id: number
  start_date: string
  end_date: string
  total_income: number
  entry_count: number
  generated_at: string
  share_token?: string | null
  share_active?: boolean
  share_expires_at?: string | null
}

export interface StatementDetail extends Statement {
  entries: IncomeEntry[]
}

export interface LoginPayload {
  phone: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  full_name: string
}

export interface IncomeEntryPayload {
  /** Idempotency key so a queued entry can be replayed safely. */
  client_uuid?: string
  amount: number
  date: string
  method: IncomeMethod
  note?: string
}

export interface MpesaImportPayload {
  source_ref: string
  raw_text: string
  file_name?: string
  note?: string
}

export interface StatementPayload {
  start_date: string
  end_date: string
}

export interface ParsedMpesaEntry {
  /** Safaricom transaction code, absent for hand-typed shorthand lines. */
  code: string | null
  date: string
  amount: number
  sender: string | null
  rawMatch: string
}

export interface AuthResponse {
  message: string
  user: User
}

export interface MessageResponse {
  message: string
}

export interface ApiErrorPayload {
  error?: string
  message?: string
}

/** A worker as an admin sees them: profile plus record totals. */
export interface AdminWorker extends User {
  total_income: number
  entry_count: number
  last_entry_date: string | null
  import_count?: number
  statement_count?: number
}

export interface AdminWorkersResponse {
  workers: AdminWorker[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface AdminWorkerQueryParams {
  search?: string
  page?: number
  perPage?: number
}

export interface AdminStats {
  worker_count: number
  entry_count: number
  total_income: number
  import_count: number
  statement_count: number
  generated_by: string
}

export interface MpesaPreviewResponse {
  entries: Array<{
    code: string | null
    amount: number
    date: string
    sender: string | null
    raw: string
  }>
  count: number
  truncated: boolean
  format: 'xml' | 'csv' | 'text'
}

export interface MpesaImportResult extends MpesaImport {
  parsed_count: number
  created_count: number
  duplicate_count: number
  format: 'xml' | 'csv' | 'text'
}

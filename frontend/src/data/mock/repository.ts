import { detectFormat, parseBulk } from '../../lib/mpesa-bulk'
import { ApiError } from '../../lib/http'
import type {
  AdminWorker,
  AdminWorkerQueryParams,
  AuthResponse,
  EntryQueryParams,
  IncomeEntry,
  IncomeEntryPayload,
  LoginPayload,
  MpesaImport,
  MpesaImportPayload,
  MpesaImportResult,
  RegisterPayload,
  Statement,
  StatementDetail,
  StatementPayload,
  TrendsResponse,
  User,
} from '../../types'
import type { KipatoRepository } from '../repository'

interface MockState {
  user: User
  entries: IncomeEntry[]
  imports: MpesaImport[]
  statements: Array<Statement & { entryIds: number[] }>
  nextEntryId: number
  nextImportId: number
  nextStatementId: number
}

const storageKey = 'kipato-mock-state-v1'
const sessionKey = 'kipato-mock-session'
const seededPassword = 'securepassword123'

const seededEntries: IncomeEntry[] = [
  createSeedEntry(1, 2400, '2026-09-03', 'cash', 'Boda boda'),
  createSeedEntry(2, 1850, '2026-09-02', 'cash', 'Shop shift'),
  createSeedEntry(3, 3000, '2026-09-01', 'mpesa', 'M-PESA sales'),
  createSeedEntry(4, 4000, '2026-08-31', 'cash', 'Market delivery'),
  createSeedEntry(5, 3000, '2026-08-30', 'mpesa', 'M-PESA order'),
  createSeedEntry(6, 2100, '2026-08-27', 'cash', 'Repairs'),
  createSeedEntry(7, 2300, '2026-08-26', 'cash', 'Shop shift'),
  createSeedEntry(8, 2400, '2026-08-25', 'mpesa', 'M-PESA sales'),
  createSeedEntry(9, 2900, '2026-08-24', 'cash', 'Boda boda'),
  createSeedEntry(10, 3000, '2026-08-23', 'mpesa', 'M-PESA order'),
]

function createSeedEntry(
  id: number,
  amount: number,
  date: string,
  method: IncomeEntry['method'],
  note: string,
): IncomeEntry {
  return {
    id,
    worker_id: 1,
    amount,
    date,
    method,
    note,
    sync_status: 'synced',
    synced_at: null,
    created_at: `${date}T17:30:00.000Z`,
  }
}

function createInitialState(): MockState {
  const statementEntries = seededEntries.filter((entry) => entry.date >= '2026-08-28')
  return {
    user: {
      id: 1,
      phone: '+254 700 000 001',
      full_name: 'Amina Wanjiku',
      email: null,
      email_verified: false,
      role: 'worker',
      created_at: '2026-08-01T08:00:00.000Z',
    },
    entries: seededEntries,
    imports: [],
    statements: [
      {
        id: 1,
        worker_id: 1,
        start_date: '2026-08-28',
        end_date: '2026-09-03',
        total_income: statementEntries.reduce((sum, entry) => sum + entry.amount, 0),
        entry_count: statementEntries.length,
        generated_at: '2026-09-03T18:00:00.000Z',
        entryIds: statementEntries.map((entry) => entry.id),
      },
    ],
    nextEntryId: 11,
    nextImportId: 1,
    nextStatementId: 2,
  }
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function readState() {
  const storage = getStorage()
  const serialized = storage?.getItem(storageKey)
  if (!serialized) {
    return createInitialState()
  }

  try {
    return JSON.parse(serialized) as MockState
  } catch {
    return createInitialState()
  }
}

let state = readState()

function persist() {
  getStorage()?.setItem(storageKey, JSON.stringify(state))
}

function getSessionStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage
}

function hasSession() {
  const storage = getSessionStorage()
  return storage?.getItem(sessionKey) !== 'signed-out'
}

function signIn() {
  getSessionStorage()?.setItem(sessionKey, 'signed-in')
}

function signOut() {
  getSessionStorage()?.setItem(sessionKey, 'signed-out')
}

function pause() {
  return new Promise((resolve) => window.setTimeout(resolve, 120))
}

function requireSession() {
  if (!hasSession()) {
    throw new ApiError('Authentication required', 401)
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createAuthResponse(message: string): AuthResponse {
  return { message, user: clone(state.user) }
}

function listEntriesResponse(params: EntryQueryParams = {}) {
    const page = params.page ?? 1
    const perPage = params.perPage ?? 20
    const filteredEntries = getFilteredEntries(params)
    const start = (page - 1) * perPage
    return {
      entries: clone(filteredEntries.slice(start, start + perPage)),
      total: filteredEntries.length,
      page,
      per_page: perPage,
      pages: Math.ceil(filteredEntries.length / perPage),
    }
  }

  function getFilteredEntries(params: EntryQueryParams = {}) {
  return state.entries
    .filter((entry) => !params.startDate || entry.date >= params.startDate)
    .filter((entry) => !params.endDate || entry.date <= params.endDate)
    .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id)
}

function getTrendsResponse(): TrendsResponse {
  const dailyBreakdown = state.entries.reduce<Record<string, number>>((breakdown, entry) => {
    breakdown[entry.date] = (breakdown[entry.date] ?? 0) + entry.amount
    return breakdown
  }, {})

  const totalIncome = state.entries.reduce((sum, entry) => sum + entry.amount, 0)
  return {
    total_income: totalIncome,
    entry_count: state.entries.length,
    average_daily: state.entries.length ? totalIncome / state.entries.length : 0,
    daily_breakdown: dailyBreakdown,
  }
}

export function createMockRepository(): KipatoRepository {
  return {
    auth: {
      async register(payload: RegisterPayload) {
        await pause()
        if (!payload.phone || !payload.full_name || !payload.password) {
          throw new ApiError('Phone, full name, and password are required', 400)
        }
        if (payload.phone === state.user.phone.replaceAll(' ', '')) {
          throw new ApiError('Phone number already registered', 409)
        }

        state.user = {
          ...state.user,
          full_name: payload.full_name,
          phone: payload.phone,
          created_at: new Date().toISOString(),
        }
        persist()
        signIn()
        return createAuthResponse('Registration successful')
      },
      async login(payload: LoginPayload) {
        await pause()
        const storedPhone = state.user.phone.replaceAll(' ', '')
        if (payload.phone !== storedPhone || payload.password !== seededPassword) {
          throw new ApiError('Invalid credentials', 401)
        }
        signIn()
        return createAuthResponse('Login successful')
      },
      async logout() {
        await pause()
        signOut()
        return { message: 'Logged out' }
      },
      async me() {
        await pause()
        requireSession()
        return { user: clone(state.user) }
      },
    },
    income: {
      async listEntries(params = {}) {
        await pause()
        requireSession()
        return listEntriesResponse(params)
      },
      async createEntry(payload: IncomeEntryPayload) {
        await pause()
        requireSession()
        const entry: IncomeEntry = {
          id: state.nextEntryId,
          worker_id: state.user.id,
          amount: payload.amount,
          date: payload.date,
          method: payload.method,
          note: payload.note ?? '',
          sync_status: 'synced',
          synced_at: null,
          created_at: new Date().toISOString(),
        }
        state.nextEntryId += 1
        state.entries.push(entry)
        persist()
        return clone(entry)
      },
      async getEntry(id: number) {
        await pause()
        requireSession()
        const entry = state.entries.find((candidate) => candidate.id === id)
        if (!entry) throw new ApiError('Resource not found', 404)
        return clone(entry)
      },
      async updateEntry(id: number, payload: Partial<IncomeEntryPayload>) {
        await pause()
        requireSession()
        const entry = state.entries.find((candidate) => candidate.id === id)
        if (!entry) throw new ApiError('Resource not found', 404)
        Object.assign(entry, payload)
        persist()
        return clone(entry)
      },
      async deleteEntry(id: number) {
        await pause()
        requireSession()
        const entryIndex = state.entries.findIndex((candidate) => candidate.id === id)
        if (entryIndex === -1) throw new ApiError('Resource not found', 404)
        state.entries.splice(entryIndex, 1)
        persist()
        return { message: 'Entry deleted' }
      },
      async getTrends() {
        await pause()
        requireSession()
        return getTrendsResponse()
      },
    },
    mpesa: {
      async listImports() {
        await pause()
        requireSession()
        return { imports: clone(state.imports) }
      },
      async createImport(payload: MpesaImportPayload) {
        await pause()
        requireSession()
        const parsedEntries = parseBulk(payload.raw_text)
        // Same rule as the API: the M-PESA transaction code makes a re-import a
        // no-op rather than a duplicate.
        const alreadyImported = new Set(
          state.entries.map((entry) => entry.client_uuid).filter(Boolean) as string[],
        )

        let created = 0
        let duplicates = 0
        for (const parsedEntry of parsedEntries) {
          const clientUuid = parsedEntry.code ? `mpesa:${parsedEntry.code}` : null
          if (clientUuid && alreadyImported.has(clientUuid)) {
            duplicates += 1
            continue
          }
          if (clientUuid) alreadyImported.add(clientUuid)

          state.entries.push({
            id: state.nextEntryId,
            worker_id: state.user.id,
            client_uuid: clientUuid,
            amount: parsedEntry.amount,
            date: parsedEntry.date,
            method: 'mpesa',
            note: payload.note || (parsedEntry.sender ? `M-PESA from ${parsedEntry.sender}` : 'M-PESA payment'),
            sync_status: 'synced',
            synced_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
          state.nextEntryId += 1
          created += 1
        }

        const importRecord: MpesaImport = {
          id: state.nextImportId,
          worker_id: state.user.id,
          source_ref: payload.source_ref,
          file_name: payload.file_name ?? null,
          entries_count: created,
          imported_at: new Date().toISOString(),
        }
        state.nextImportId += 1
        state.imports.unshift(importRecord)
        persist()

        const result: MpesaImportResult = {
          ...clone(importRecord),
          parsed_count: parsedEntries.length,
          created_count: created,
          duplicate_count: duplicates,
          format: detectFormat(payload.raw_text),
        }
        return result
      },
    },
    statements: {
      async listStatements() {
        await pause()
        requireSession()
        return { statements: clone(state.statements) }
      },
      async createStatement(payload: StatementPayload) {
        await pause()
        requireSession()
        const entries = getFilteredEntries({ startDate: payload.start_date, endDate: payload.end_date })
        const statement = {
          id: state.nextStatementId,
          worker_id: state.user.id,
          start_date: payload.start_date,
          end_date: payload.end_date,
          total_income: entries.reduce((sum, entry) => sum + entry.amount, 0),
          entry_count: entries.length,
          generated_at: new Date().toISOString(),
          entryIds: entries.map((entry) => entry.id),
        }
        state.nextStatementId += 1
        state.statements.unshift(statement)
        persist()
        return clone(statement)
      },
      async getStatement(id: number) {
        await pause()
        requireSession()
        const statement = state.statements.find((candidate) => candidate.id === id)
        if (!statement) throw new ApiError('Resource not found', 404)
        const entries = state.entries.filter((entry) => statement.entryIds.includes(entry.id))
        const detail: StatementDetail = {
          ...statement,
          entries: clone(entries),
        }
        return detail
      },
    },
    // Demo mode has exactly one worker, so the admin views describe that one.
    admin: {
      async getStats() {
        await pause()
        requireSession()
        return {
          worker_count: 1,
          entry_count: state.entries.length,
          total_income: state.entries.reduce((sum, entry) => sum + entry.amount, 0),
          import_count: state.imports.length,
          statement_count: state.statements.length,
          generated_by: state.user.full_name,
        }
      },
      async listWorkers(params: AdminWorkerQueryParams = {}) {
        await pause()
        requireSession()
        const worker = mockAdminWorker(state)
        const search = (params.search ?? '').trim().toLowerCase()
        const matches = !search
          || worker.full_name.toLowerCase().includes(search)
          || worker.phone.toLowerCase().includes(search)
        const workers = matches ? [worker] : []
        return { workers, total: workers.length, page: 1, per_page: 20, pages: 1 }
      },
      async getWorker(id: number) {
        await pause()
        requireSession()
        if (id !== state.user.id) throw new ApiError('Worker not found', 404)
        return {
          worker: {
            ...mockAdminWorker(state),
            import_count: state.imports.length,
            statement_count: state.statements.length,
          },
        }
      },
      async listWorkerEntries(id: number, params: EntryQueryParams = {}) {
        await pause()
        requireSession()
        if (id !== state.user.id) throw new ApiError('Worker not found', 404)
        return listEntriesResponse(params)
      },
      async listWorkerStatements(id: number) {
        await pause()
        requireSession()
        if (id !== state.user.id) throw new ApiError('Worker not found', 404)
        return { statements: clone(state.statements) }
      },
    },
  }
}

function mockAdminWorker(state: MockState): AdminWorker {
  const dates = state.entries.map((entry) => entry.date).sort()
  return {
    ...state.user,
    total_income: state.entries.reduce((sum, entry) => sum + entry.amount, 0),
    entry_count: state.entries.length,
    last_entry_date: dates.length > 0 ? dates[dates.length - 1] : null,
  }
}

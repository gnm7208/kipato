import { parseMpesaText } from './mpesa-parser'
import type { ParsedMpesaEntry } from '../types'

/**
 * Bulk sources of M-PESA history.
 *
 * A browser cannot read a phone's SMS inbox, so importing everything at once
 * means handing Kipato a file. Three shapes cover what workers actually have:
 * an SMS Backup & Restore XML export, an M-PESA statement CSV, or a long paste.
 *
 * Mirrors `server/utils/mpesa_bulk.py`; change them together.
 */

export type BulkFormat = 'xml' | 'csv' | 'text'

const RECEIPT_COLUMNS = ['receipt no.', 'receipt no', 'receipt', 'transaction id']
const DATE_COLUMNS = ['completion time', 'date', 'date & time', 'completion date']
const PAID_IN_COLUMNS = ['paid in', 'paid_in', 'credit', 'amount received']
const DETAIL_COLUMNS = ['details', 'description', 'narrative']

const MAX_AMOUNT = 1_000_000

export function detectFormat(rawText: string): BulkFormat {
  const head = rawText.trimStart().slice(0, 2000)
  if (head.startsWith('<?xml') || head.includes('<smses') || head.includes('<sms ')) return 'xml'
  if (findCsvHeader(rawText) !== null) return 'csv'
  return 'text'
}

export function parseBulk(rawText: string): ParsedMpesaEntry[] {
  if (!rawText) return []

  switch (detectFormat(rawText)) {
    case 'xml':
      return dedupe(parseSmsBackupXml(rawText))
    case 'csv':
      return dedupe(parseStatementCsv(rawText))
    default:
      return parseMpesaText(rawText)
  }
}

function dedupe(entries: ParsedMpesaEntry[]): ParsedMpesaEntry[] {
  const seen = new Set<string>()
  const unique: ParsedMpesaEntry[] = []
  for (const entry of entries) {
    if (entry.code) {
      if (seen.has(entry.code)) continue
      seen.add(entry.code)
    }
    unique.push(entry)
  }
  return unique
}

function parseSmsBackupXml(rawText: string): ParsedMpesaEntry[] {
  let document: Document
  try {
    document = new DOMParser().parseFromString(rawText, 'application/xml')
  } catch {
    return []
  }
  if (document.querySelector('parsererror')) return []

  const entries: ParsedMpesaEntry[] = []
  for (const element of document.querySelectorAll('sms, mms')) {
    const body = element.getAttribute('body') ?? ''
    if (!body) continue

    const address = (element.getAttribute('address') ?? '').toUpperCase()
    // Keep messages from M-PESA. An unnamed sender still gets a look, since the
    // parser itself rejects anything that is not a confirmation.
    if (address && !address.replace(/[-\s]/g, '').includes('MPESA')) continue

    entries.push(...parseMpesaText(body))
  }
  return entries
}

/** Minimal RFC 4180 reader: enough for quoted "2,000.00" amounts. */
function parseCsvRows(rawText: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index]

    if (inQuotes) {
      if (char === '"') {
        if (rawText[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && rawText[index + 1] === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function findCsvHeader(rawText: string): string[] | null {
  const rows = parseCsvRows(rawText)
  // Statements carry a few preamble rows before the real header.
  for (const row of rows.slice(0, 25)) {
    const lowered = row.map((cell) => cell.trim().toLowerCase())
    const hasReceipt = lowered.some((cell) => RECEIPT_COLUMNS.includes(cell))
    const hasPaidIn = lowered.some((cell) => PAID_IN_COLUMNS.includes(cell))
    if (hasReceipt && hasPaidIn) return lowered
  }
  return null
}

function columnIndex(header: string[], names: string[]): number {
  return header.findIndex((cell) => names.includes(cell))
}

function parseStatementCsv(rawText: string): ParsedMpesaEntry[] {
  const header = findCsvHeader(rawText)
  if (!header) return []

  const receiptAt = columnIndex(header, RECEIPT_COLUMNS)
  const dateAt = columnIndex(header, DATE_COLUMNS)
  const paidInAt = columnIndex(header, PAID_IN_COLUMNS)
  const detailAt = columnIndex(header, DETAIL_COLUMNS)
  if (paidInAt < 0) return []

  const entries: ParsedMpesaEntry[] = []
  let reachedHeader = false

  for (const row of parseCsvRows(rawText)) {
    const lowered = row.map((cell) => cell.trim().toLowerCase())
    if (!reachedHeader) {
      reachedHeader = lowered.length === header.length && lowered.every((cell, i) => cell === header[i])
      continue
    }
    if (row.length <= paidInAt) continue

    const amount = toAmount(row[paidInAt])
    // No money in on this row: it is a payment, withdrawal or a total.
    if (amount === null) continue

    const date = dateAt >= 0 && row.length > dateAt ? toIsoDate(row[dateAt]) : null
    if (!date) continue

    const code = receiptAt >= 0 && row.length > receiptAt ? row[receiptAt].trim().toUpperCase() : ''
    const details = detailAt >= 0 && row.length > detailAt ? row[detailAt].trim() : ''

    entries.push({
      code: code || null,
      amount,
      date,
      sender: senderFromDetails(details),
      rawMatch: row.map((cell) => cell.trim()).join(', ').slice(0, 500),
    })
  }

  return entries
}

function toAmount(value: string): number | null {
  const cleaned = (value ?? '').replace(/,/g, '').replace(/Ksh|KES/gi, '').trim()
  if (!cleaned) return null
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null
  return amount
}

function toIsoDate(value: string): string | null {
  const cleaned = (value ?? '').trim()
  if (!cleaned) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(cleaned)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(cleaned)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null
    return `${dmy[3]}-${month}-${day}`
  }
  return null
}

function senderFromDetails(details: string): string | null {
  if (!details) return null
  const match = /from\s+([A-Za-z][A-Za-z.'\- ]{1,60})/i.exec(details)
  if (match) {
    const sender = match[1].split(/\s+/).join(' ').replace(/^[.,\-\s]+|[.,\-\s]+$/g, '')
    return sender ? sender.slice(0, 120) : null
  }
  return details.slice(0, 120)
}

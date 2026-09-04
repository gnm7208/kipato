import type { ParsedMpesaEntry } from '../types'

/**
 * Parser for pasted M-PESA confirmation messages.
 *
 * Only *inbound* money counts as income: a message about money the worker sent,
 * paid or withdrew must never become an income entry.
 *
 * This mirrors `server/utils/mpesa_parser.py`; change them together.
 */

// A Safaricom transaction code: 10 alphanumerics, e.g. "RJ12ABC123".
const TXN_CODE = '[A-Z0-9]{10}'

const CODE_RE = new RegExp(`\\b(${TXN_CODE})\\b(?=\\s+Confirmed)`, 'i')
const SPLIT_RE = new RegExp(`(?=\\b${TXN_CODE}\\b\\s+Confirmed)`, 'i')

const AMOUNT = '(?:Ksh|KES|Kshs)\\s*\\.?\\s*(\\d[\\d,]*(?:\\.\\d{1,2})?)'
// "received Ksh500.00" and "Ksh500.00 received" are both in the wild.
const RECEIVED_THEN_AMOUNT_RE = new RegExp(`receiv(?:ed|e)\\s+${AMOUNT}`, 'i')
const AMOUNT_THEN_RECEIVED_RE = new RegExp(`${AMOUNT}\\s+receiv(?:ed|e)\\b`, 'i')

// Money leaving the worker's wallet. Never income.
const OUTBOUND_RE =
  /\b(sent to|paid to|pay bill to|withdraw|bought|buy goods to|transferred to|airtime)\b/i
const INBOUND_RE = /\breceiv(?:ed|e)\b/i

const DMY_RE = /\bon\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i
const ISO_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/

const SENDER_RE =
  /\bfrom\s+([A-Za-z][A-Za-z.'\- ]{1,60}?)(?=\s+(?:\+?254\d{9}|0\d{9}|\d{10,12})\b|\s+on\b|\s*[.,]|$)/i

// Fallback for hand-typed lines: "2026-09-01 Received 1000.00 from ...".
const PLAIN_RE = /(\d{4}-\d{2}-\d{2}).*?(\d[\d,]*\.\d{2})/

const MAX_AMOUNT = 1_000_000

function toAmount(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null
  return value
}

function toIsoDate(day: number, month: number, year: number): string | null {
  const fullYear = year < 100 ? year + 2000 : year
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const parsed = new Date(Date.UTC(fullYear, month - 1, day))
  // Rejects the likes of 31 February, which Date would otherwise roll forward.
  if (
    parsed.getUTCFullYear() !== fullYear ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }
  return parsed.toISOString().slice(0, 10)
}

function findDate(segment: string): string | null {
  const dmy = DMY_RE.exec(segment)
  if (dmy) {
    // Safaricom formats Kenyan dates as day/month/year.
    const parsed = toIsoDate(Number(dmy[1]), Number(dmy[2]), Number(dmy[3]))
    if (parsed) return parsed
  }
  const iso = ISO_RE.exec(segment)
  if (iso) return toIsoDate(Number(iso[3]), Number(iso[2]), Number(iso[1]))
  return null
}

function findAmount(segment: string): number | null {
  // Anchor on the "received" keyword so the closing balance is never mistaken
  // for the transaction amount.
  for (const pattern of [RECEIVED_THEN_AMOUNT_RE, AMOUNT_THEN_RECEIVED_RE]) {
    const match = pattern.exec(segment)
    if (match) {
      const amount = toAmount(match[1])
      if (amount !== null) return amount
    }
  }
  return null
}

function findSender(segment: string): string | null {
  const match = SENDER_RE.exec(segment)
  if (!match) return null
  const sender = match[1].split(/\s+/).join(' ').replace(/^[.,\-\s]+|[.,\-\s]+$/g, '')
  return sender ? sender.slice(0, 120) : null
}

function splitMessages(rawText: string): string[] {
  const segments: string[] = []
  for (const block of rawText.split(/[\r\n]+/)) {
    const trimmed = block.trim()
    if (!trimmed) continue
    // Several SMS pasted onto one line still split on their transaction code.
    for (const part of trimmed.split(SPLIT_RE)) {
      const normalised = part.split(/\s+/).join(' ').trim()
      if (normalised) segments.push(normalised)
    }
  }
  return segments
}

export function parseMpesaText(rawText: string): ParsedMpesaEntry[] {
  if (!rawText) return []

  const entries: ParsedMpesaEntry[] = []
  const seenCodes = new Set<string>()

  for (const segment of splitMessages(rawText)) {
    const outbound = OUTBOUND_RE.test(segment)
    if (outbound && !INBOUND_RE.test(segment)) continue

    let amount = findAmount(segment)
    if (amount === null && outbound) continue

    let date = findDate(segment)

    if (amount === null || date === null) {
      const plain = PLAIN_RE.exec(segment)
      if (!plain) continue
      amount = toAmount(plain[2])
      date = findDate(plain[1])
      if (amount === null || date === null) continue
    }

    const codeMatch = CODE_RE.exec(segment)
    const code = codeMatch ? codeMatch[1].toUpperCase() : null
    if (code) {
      if (seenCodes.has(code)) continue
      seenCodes.add(code)
    }

    entries.push({
      code,
      date,
      amount,
      sender: findSender(segment),
      rawMatch: segment.slice(0, 500),
    })
  }

  return entries
}

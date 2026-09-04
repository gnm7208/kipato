import type { IncomeEntry, TrendsResponse } from '../types'
import { formatDate } from './formatters'

export interface PeriodComparison {
  currentTotal: number
  previousTotal: number
  deltaPercent: number | null
  currentStart: string
  currentEnd: string
}

export interface TrendPoint {
  date: string
  label: string
  shortLabel: string
  amount: number
  isCurrentPeriod: boolean
}

export interface BestDay {
  date: string
  label: string
  amount: number
}

export interface ConsistencyScore {
  loggedDays: number
  totalDays: number
  percentage: number
  startDate: string
  endDate: string
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(value: Date, days: number) {
  const result = new Date(value)
  result.setDate(result.getDate() + days)
  return result
}

export function getReferenceDate(entries: IncomeEntry[], fallback = new Date()) {
  if (entries.length === 0) {
    return toDateKey(fallback)
  }

  return entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), entries[0].date)
}

function isBetween(value: string, start: Date, end: Date) {
  const date = parseDateKey(value).getTime()
  return date >= start.getTime() && date <= end.getTime()
}

function sumEntries(entries: IncomeEntry[], start: Date, end: Date) {
  return entries
    .filter((entry) => isBetween(entry.date, start, end))
    .reduce((total, entry) => total + entry.amount, 0)
}

export function getPeriodComparison(entries: IncomeEntry[], endDate: string): PeriodComparison {
  const end = parseDateKey(endDate)
  const currentStart = addDays(end, -6)
  const previousEnd = addDays(end, -7)
  const previousStart = addDays(end, -13)
  const currentTotal = sumEntries(entries, currentStart, end)
  const previousTotal = sumEntries(entries, previousStart, previousEnd)

  return {
    currentTotal,
    previousTotal,
    deltaPercent: previousTotal === 0 ? null : ((currentTotal - previousTotal) / previousTotal) * 100,
    currentStart: toDateKey(currentStart),
    currentEnd: toDateKey(end),
  }
}

export function getTrendPoints(
  trends: TrendsResponse,
  endDate: string,
  days = 7,
): TrendPoint[] {
  const end = parseDateKey(endDate)
  const start = addDays(end, -(days - 1))

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index)
    const dateKey = toDateKey(date)
    const dateLabel = formatDate(dateKey)

    return {
      date: dateKey,
      label: dateLabel,
      shortLabel: dateLabel.split(' ')[0],
      amount: trends.daily_breakdown[dateKey] ?? 0,
      isCurrentPeriod: index === days - 1,
    }
  })
}

export function getBestDay(dailyBreakdown: Record<string, number>): BestDay | null {
  const entries = Object.entries(dailyBreakdown)
  if (entries.length === 0) {
    return null
  }

  const [date, amount] = entries.reduce((best, current) => (current[1] > best[1] ? current : best))
  return {
    date,
    label: new Intl.DateTimeFormat('en-KE', { weekday: 'long' }).format(parseDateKey(date)),
    amount,
  }
}

export function getConsistencyScore(entries: IncomeEntry[], endDate: string, days = 7): ConsistencyScore {
  const end = parseDateKey(endDate)
  const start = addDays(end, -(days - 1))
  const loggedDates = new Set(
    entries
      .filter((entry) => isBetween(entry.date, start, end))
      .map((entry) => entry.date),
  )

  return {
    loggedDays: loggedDates.size,
    totalDays: days,
    percentage: Math.round((loggedDates.size / days) * 100),
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  }
}

export function getMpesaShare(entries: IncomeEntry[]) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)
  const mpesaTotal = entries
    .filter((entry) => entry.method === 'mpesa')
    .reduce((sum, entry) => sum + entry.amount, 0)

  return total === 0 ? 0 : Math.round((mpesaTotal / total) * 100)
}

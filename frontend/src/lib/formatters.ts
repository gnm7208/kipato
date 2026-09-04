const numberFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 2,
})

const compactNumberFormatter = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const dateFormatter = new Intl.DateTimeFormat('en-KE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-KE', {
  hour: 'numeric',
  minute: '2-digit',
})

function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

export function formatKsh(amount: number) {
  return `KSh ${numberFormatter.format(amount)}`
}

export function formatCompactKsh(amount: number) {
  return `KSh ${compactNumberFormatter.format(amount)}`
}

export function formatDate(value: string) {
  return dateFormatter.format(parseDate(value))
}

export function formatLongDate(value: string) {
  return longDateFormatter.format(parseDate(value))
}

export function formatTime(value: string) {
  return timeFormatter.format(parseDate(value))
}

export function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} — ${formatDate(end)}`
}

export function formatPhone(phone: string) {
  return phone.replace(/(\+254)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')
}

export function formatPercentage(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }

  return `${Math.round(value)}%`
}

export function formatEntriesCount(count: number) {
  return `${count} ${count === 1 ? 'record' : 'records'}`
}

export function formatSyncStatus(status: 'synced' | 'pending' | 'failed') {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function formatMethod(method: 'cash' | 'mpesa') {
  return method === 'mpesa' ? 'M-PESA' : 'Cash'
}

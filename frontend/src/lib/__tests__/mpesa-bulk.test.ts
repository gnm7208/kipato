import { describe, expect, it } from 'vitest'
import { detectFormat, parseBulk } from '../mpesa-bulk'

const SMS_BACKUP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<smses count="4">
  <sms address="MPESA" date="1756900000000" type="1" body="RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 on 3/9/26 at 10:15 AM New M-PESA balance is Ksh1,234.00." />
  <sms address="MPESA" date="1756900001000" type="1" body="TFG5H6J7K8 Confirmed. Ksh300.00 sent to NAIVAS on 3/9/26 at 11:00 AM" />
  <sms address="Safaricom" date="1756900002000" type="1" body="Your data bundle expires soon" />
  <sms address="M-PESA" date="1756900003000" type="1" body="QQ11WW22EE Confirmed. Ksh2,000.00 received from JANE W 254700000000 on 1/9/26 at 9:00 AM" />
</smses>`

const STATEMENT_CSV = `M-PESA Statement
Customer Name: DEMO WORKER

Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance
RJ12ABC123,2026-09-03 10:15:00,Funds received from JOHN DOE 254712345678,Completed,500.00,,1234.00
TFG5H6J7K8,2026-09-03 11:00:00,Pay Bill to NAIVAS,Completed,,300.00,934.00
QQ11WW22EE,2026-09-01 09:00:00,Funds received from JANE W,Completed,"2,000.00",,2934.00
`

describe('bulk M-PESA import', () => {
  it('detects each supported format', () => {
    expect(detectFormat(SMS_BACKUP_XML)).toBe('xml')
    expect(detectFormat(STATEMENT_CSV)).toBe('csv')
    expect(detectFormat('RJ12ABC123 Confirmed. You have received Ksh1.00 on 1/9/26')).toBe('text')
  })

  it('keeps only incoming M-PESA messages from an SMS backup', () => {
    const entries = parseBulk(SMS_BACKUP_XML)

    expect(entries.map((entry) => entry.code)).toEqual(['RJ12ABC123', 'QQ11WW22EE'])
    expect(entries[0]).toMatchObject({ amount: 500, date: '2026-09-03', sender: 'JOHN DOE' })
    expect(entries[1].amount).toBe(2000)
  })

  it('reads the Paid In column of a statement and ignores withdrawals', () => {
    const entries = parseBulk(STATEMENT_CSV)

    expect(entries.map((entry) => entry.code)).toEqual(['RJ12ABC123', 'QQ11WW22EE'])
    expect(entries[0].amount).toBe(500)
    expect(entries[1].amount).toBe(2000)
    expect(entries.some((entry) => entry.code === 'TFG5H6J7K8')).toBe(false)
  })

  it('de-duplicates repeated transaction codes', () => {
    const doubled = SMS_BACKUP_XML.replace(
      '</smses>',
      '  <sms address="MPESA" type="1" body="RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE on 3/9/26 at 10:15 AM" />\n</smses>',
    )
    expect(parseBulk(doubled)).toHaveLength(2)
  })

  it('returns nothing for malformed or empty input', () => {
    expect(parseBulk('')).toEqual([])
    expect(parseBulk("<smses><sms body='unclosed")).toEqual([])
  })

  it('falls through to the plain SMS parser', () => {
    const entries = parseBulk(
      'RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE on 3/9/26 at 10:15 AM',
    )
    expect(entries).toHaveLength(1)
    expect(entries[0].amount).toBe(500)
  })

  it('handles a large backup', () => {
    const messages = Array.from({ length: 400 }, (_, index) =>
      `<sms address="MPESA" type="1" body="CODE${String(index).padStart(6, '0')} Confirmed. You have received Ksh${100 + index}.00 from SENDER on 3/9/26 at 10:15 AM" />`,
    ).join('\n')
    const entries = parseBulk(`<?xml version="1.0"?><smses>${messages}</smses>`)

    expect(entries).toHaveLength(400)
  })
})

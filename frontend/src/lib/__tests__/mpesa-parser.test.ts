import { describe, expect, it } from 'vitest'
import { parseMpesaText } from '../mpesa-parser'

const RECEIVED =
  'RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 ' +
  'on 3/9/26 at 10:15 AM New M-PESA balance is Ksh1,234.00.'
const RECEIVED_ALT =
  'SFH8ABC1D2 Confirmed. Ksh1,500.00 received from JANE WANJIKU 254700000000 on 12/8/26 at 4:05 PM'
const SENT = 'TFG5H6J7K8 Confirmed. Ksh300.00 sent to NAIVAS LTD on 3/9/26 at 11:00 AM'
const PAID = 'AB12CD34EF Confirmed. Ksh450.00 paid to KPLC PREPAID on 2/9/26 at 8:00 AM'
const WITHDRAWN =
  'ZZ99YY88XX Confirmed. Withdraw Ksh1,000.00 from AGENT 123456 on 2/9/26 at 1:00 PM'

describe('parseMpesaText', () => {
  it('parses a standard received message', () => {
    const entries = parseMpesaText(RECEIVED)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      code: 'RJ12ABC123',
      amount: 500,
      date: '2026-09-03',
      sender: 'JOHN DOE',
    })
  })

  it('reads the transaction amount, not the closing balance', () => {
    expect(parseMpesaText(RECEIVED)[0].amount).toBe(500)
  })

  it('parses the alternate wording and Kenyan day/month order', () => {
    const entry = parseMpesaText(RECEIVED_ALT)[0]
    expect(entry.amount).toBe(1500)
    expect(entry.date).toBe('2026-08-12')
    expect(entry.sender).toBe('JANE WANJIKU')
  })

  it('never treats outgoing money as income', () => {
    for (const message of [SENT, PAID, WITHDRAWN]) {
      expect(parseMpesaText(message)).toEqual([])
    }
  })

  it('keeps only incoming messages from a mixed paste', () => {
    const entries = parseMpesaText([RECEIVED, SENT, RECEIVED_ALT, PAID].join('\n'))
    expect(entries.map((entry) => entry.code)).toEqual(['RJ12ABC123', 'SFH8ABC1D2'])
  })

  it('collapses repeated transaction codes', () => {
    expect(parseMpesaText([RECEIVED, RECEIVED].join('\n'))).toHaveLength(1)
  })

  it('splits several messages pasted onto one line', () => {
    expect(parseMpesaText(`${RECEIVED} ${RECEIVED_ALT}`)).toHaveLength(2)
  })

  it('still accepts the hand-typed shorthand', () => {
    const entries = parseMpesaText('2026-09-01 Received 1000.00 from 254700000001')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ amount: 1000, date: '2026-09-01', code: null })
  })

  it('handles thousands separators without decimals', () => {
    const entry = parseMpesaText(
      'QQ11WW22EE Confirmed. You have received Ksh12,000 from PETER K on 1/9/26 at 9:00 AM',
    )[0]
    expect(entry.amount).toBe(12000)
  })

  it('returns nothing for junk or empty input', () => {
    expect(parseMpesaText('')).toEqual([])
    expect(parseMpesaText('hello there, no money here')).toEqual([])
  })

  it('rejects an impossible date', () => {
    expect(
      parseMpesaText('QQ11WW22EE Confirmed. You have received Ksh100.00 from X on 45/13/26 at 9:00 AM'),
    ).toEqual([])
  })
})

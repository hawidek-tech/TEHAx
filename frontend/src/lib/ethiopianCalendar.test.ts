import { describe, expect, it } from 'vitest'
import { formatEthiopian, toEthiopian } from './ethiopianCalendar'

describe('Ethiopian calendar conversion', () => {
  it('maps 12 September 2023 (New Year after leap year 2015) to 1 Meskerem 2016', () => {
    expect(toEthiopian(new Date(2023, 8, 12))).toEqual({ year: 2016, month: 1, day: 1 })
  })
  it('maps 11 September 2024 to 1 Meskerem 2017', () => {
    expect(toEthiopian(new Date(2024, 8, 11))).toEqual({ year: 2017, month: 1, day: 1 })
  })
  it('converts 7 January (Ethiopian Christmas) to 29 Tahsas', () => {
    expect(toEthiopian(new Date(2025, 0, 7))).toEqual({ year: 2017, month: 4, day: 29 })
  })
  it('maps 11 September 2023 to Pagume 6, 2015 (leap year)', () => {
    expect(toEthiopian(new Date(2023, 8, 11))).toEqual({ year: 2015, month: 13, day: 6 })
  })
  it('formats with Amharic month names', () => {
    expect(formatEthiopian(new Date(2024, 8, 11), 'am')).toBe('መስከረም 1, 2017')
  })
})

/**
 * Gregorian → Ethiopian calendar conversion (Amete Mihret), used to show dates in the calendar most
 * people in Ethiopia use day to day. Algorithm: convert to Julian Day Number, then to the Ethiopian era.
 */
const ETHIOPIAN_EPOCH = 1723856 // Amete Mihret epoch offset (Julian Day Number)

function gregorianToJdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  )
}

export interface EthiopianDate {
  year: number
  month: number // 1..13
  day: number
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const r = (jdn - ETHIOPIAN_EPOCH) % 1461
  const n = (r % 365) + 365 * Math.floor(r / 1460)
  const year =
    4 * Math.floor((jdn - ETHIOPIAN_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460)
  const month = Math.floor(n / 30) + 1
  const day = (n % 30) + 1
  return { year, month, day }
}

export const ETHIOPIAN_MONTHS: Record<string, string[]> = {
  am: [
    'መስከረም',
    'ጥቅምት',
    'ኅዳር',
    'ታኅሣሥ',
    'ጥር',
    'የካቲት',
    'መጋቢት',
    'ሚያዝያ',
    'ግንቦት',
    'ሰኔ',
    'ሐምሌ',
    'ነሐሴ',
    'ጳጉሜ',
  ],
  ti: [
    'መስከረም',
    'ጥቅምቲ',
    'ሕዳር',
    'ታሕሳስ',
    'ጥሪ',
    'ለካቲት',
    'መጋቢት',
    'ሚያዝያ',
    'ግንቦት',
    'ሰነ',
    'ሓምለ',
    'ነሓሰ',
    'ጳጉሜን',
  ],
  om: [
    'Fulbaana',
    'Onkololeessa',
    'Sadaasa',
    'Muddee',
    'Amajjii',
    'Guraandhala',
    'Bitootessa',
    'Elba',
    'Caamsaa',
    'Waxabajjii',
    'Adooleessa',
    'Hagayya',
    'Qaammee',
  ],
  en: [
    'Meskerem',
    'Tikimt',
    'Hidar',
    'Tahsas',
    'Tir',
    'Yekatit',
    'Megabit',
    'Miyazya',
    'Ginbot',
    'Sene',
    'Hamle',
    'Nehase',
    'Pagume',
  ],
}

export function formatEthiopian(date: Date, locale: string): string {
  const e = toEthiopian(date)
  const months = ETHIOPIAN_MONTHS[locale] ?? ETHIOPIAN_MONTHS.en
  return `${months[e.month - 1]} ${e.day}, ${e.year}`
}

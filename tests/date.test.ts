import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  formatDateLong,
  isCalendarDate,
  parseCursorParam,
  parseDateParam,
  todayInTimezone,
  type SearchParam,
} from '@/lib/date'

/**
 * Everything a search param can be that is not a usable date. Annotated rather
 * than `as const`, so the repeated-param case stays a mutable string[] — the
 * shape Next actually hands over.
 */
const UNUSABLE_PARAMS: [label: string, param: SearchParam][] = [
  ['absent', undefined],
  ['garbage', 'banana'],
  ['impossible', '2026-02-31'],
  // Repeated params arrive as an array. Falling back beats guessing which of
  // the two the reader meant.
  ['repeated', ['2026-08-17', '2026-08-18']],
]

// SPEC §12 — implemented alongside lib/date.ts.
describe('todayInTimezone', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the correct date across a UTC-day boundary for Asia/Tokyo', () => {
    // 00:30 on the 16th in Tokyo (UTC+9) is still the 15th in UTC. Deriving the
    // date from the server's own clock is the bug this helper exists to prevent.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T15:30:00Z'))

    expect(todayInTimezone('Asia/Tokyo')).toBe('2026-01-16')
    expect(todayInTimezone('UTC')).toBe('2026-01-15')
  })

  it('does not roll over one second before the boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T14:59:59Z'))

    expect(todayInTimezone('Asia/Tokyo')).toBe('2026-01-15')
  })

  it('zero-pads single-digit months and days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T00:00:00Z'))

    expect(todayInTimezone('Asia/Tokyo')).toBe('2026-03-08')
  })
})

describe('formatDateLong', () => {
  it('renders a YYYY-MM-DD string as a long date', () => {
    expect(formatDateLong('2026-08-17')).toBe('Monday, 17 August 2026')
  })

  it('does not shift the day for a negative-offset local timezone', () => {
    // `new Date('2026-08-17')` is UTC midnight, so formatting it in a zone
    // behind UTC would render the 16th. The stored date is a calendar date in
    // the team's zone and must survive display unchanged.
    const original = process.env.TZ
    process.env.TZ = 'America/Los_Angeles'

    try {
      expect(formatDateLong('2026-08-17')).toContain('17 August 2026')
    } finally {
      process.env.TZ = original
    }
  })
})

// SPEC §6.1 — the guard behind "an invalid ?date= falls back to today".
describe('isCalendarDate', () => {
  it('accepts a real date', () => {
    expect(isCalendarDate('2026-08-17')).toBe(true)
    expect(isCalendarDate('2024-02-29')).toBe(true) // a real leap day
  })

  it.each(['2026-02-31', '2026-04-31', '2023-02-29'])(
    'rejects the impossible date %s',
    (value) => {
      // The reason this helper is not just a regex: Date rolls these forward
      // silently rather than failing, so '2026-02-31' would otherwise be
      // accepted and then render as 3 March.
      expect(isCalendarDate(value)).toBe(false)
    },
  )

  it.each(['2026-13-01', '2026-00-10', '2026-01-32'])(
    'rejects the out-of-range date %s',
    (value) => {
      expect(isCalendarDate(value)).toBe(false)
    },
  )

  it.each(['', 'banana', '2026-8-17', '2026/08/17', '2026-08-17T00:00:00Z'])(
    'rejects the malformed input %s',
    (value) => {
      expect(isCalendarDate(value)).toBe(false)
    },
  )
})

describe('parseDateParam', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes a valid date through untouched', () => {
    expect(parseDateParam('2026-08-17', 'Asia/Tokyo')).toBe('2026-08-17')
  })

  it.each(UNUSABLE_PARAMS)('falls back to today when %s', (_label, param) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T15:30:00Z'))

    expect(parseDateParam(param, 'Asia/Tokyo')).toBe('2026-01-16')
  })
})

describe('parseCursorParam', () => {
  it('passes a valid cursor through untouched', () => {
    expect(parseCursorParam('2026-08-17')).toBe('2026-08-17')
  })

  it.each(UNUSABLE_PARAMS)(
    'returns undefined — the first page — when %s',
    (_label, param) => {
      expect(parseCursorParam(param)).toBeUndefined()
    },
  )
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatDateLong, todayInTimezone } from '@/lib/date'

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

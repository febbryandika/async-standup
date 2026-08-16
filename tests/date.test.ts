import { afterEach, describe, expect, it, vi } from 'vitest'

import { todayInTimezone } from '@/lib/date'

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

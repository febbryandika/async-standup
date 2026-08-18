import { describe, expect, it } from 'vitest'

import {
  buildAttendanceGrid,
  weekdaysEndingAt,
  type AttendanceRecord,
} from '@/lib/attendance'

// 2026-08-18 is a Tuesday.
const TUESDAY = '2026-08-18'

const MEMBERS = [
  { userId: 'u1', name: 'Mika Sato' },
  { userId: 'u2', name: 'Haruto Ishikawa' },
  // Seeded to have never posted at all — the case a SQL join would drop.
  { userId: 'u3', name: 'Ren Takahashi' },
]

describe('weekdaysEndingAt', () => {
  it('walks back from the given day, inclusive', () => {
    expect(weekdaysEndingAt(TUESDAY, 3)).toEqual([
      '2026-08-14',
      '2026-08-17',
      TUESDAY,
    ])
  })

  it('skips the weekend rather than drawing it as a gap', () => {
    // Friday the 14th, then Thursday — never the 15th or 16th.
    const window = weekdaysEndingAt(TUESDAY, 10)

    expect(window).toHaveLength(10)
    expect(window).not.toContain('2026-08-15')
    expect(window).not.toContain('2026-08-16')
    expect(window.at(0)).toBe('2026-08-05')
  })

  it('ends at the last weekday when asked for a Saturday', () => {
    expect(weekdaysEndingAt('2026-08-22', 1)).toEqual(['2026-08-21'])
  })

  it('returns nothing for a window of no days', () => {
    expect(weekdaysEndingAt(TUESDAY, 0)).toEqual([])
  })
})

describe('buildAttendanceGrid', () => {
  const dates = weekdaysEndingAt(TUESDAY, 3) // 14th, 17th, 18th

  const records: AttendanceRecord[] = [
    { userId: 'u1', date: '2026-08-14', blocked: false },
    { userId: 'u1', date: '2026-08-17', blocked: true },
    { userId: 'u1', date: TUESDAY, blocked: false },
    { userId: 'u2', date: TUESDAY, blocked: false },
  ]

  it('separates a blocked day from an ordinary posted one', () => {
    const [mika] = buildAttendanceGrid(MEMBERS, dates, records)

    expect(mika?.cells.map((cell) => cell.tone)).toEqual([
      'posted',
      'blocked',
      'posted',
    ])
  })

  it('marks the days a member skipped', () => {
    const [, haruto] = buildAttendanceGrid(MEMBERS, dates, records)

    expect(haruto?.cells.map((cell) => cell.tone)).toEqual([
      'missing',
      'missing',
      'posted',
    ])
  })

  it('keeps a member who has never posted, as an all-missing row', () => {
    const grid = buildAttendanceGrid(MEMBERS, dates, records)
    const ren = grid.find((row) => row.userId === 'u3')

    expect(grid).toHaveLength(3)
    expect(ren?.cells.every((cell) => cell.tone === 'missing')).toBe(true)
    expect(ren?.posted).toBe(0)
    expect(ren?.rate).toBe(0)
  })

  it('counts a blocked day as posted in the rate', () => {
    // Being stuck is not the same as being silent, and the rate is about
    // whether the update landed.
    const grid = buildAttendanceGrid(MEMBERS, dates, records)

    expect(grid[0]?.posted).toBe(3)
    expect(grid[0]?.rate).toBe(100)
    expect(grid[1]?.rate).toBe(33)
  })

  it('preserves the order the members were given in', () => {
    expect(
      buildAttendanceGrid(MEMBERS, dates, records).map((r) => r.name),
    ).toEqual(['Mika Sato', 'Haruto Ishikawa', 'Ren Takahashi'])
  })
})

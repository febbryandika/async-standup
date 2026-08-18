import { shiftDate } from './date'

/**
 * What one member did on one day. Three states, because "did not post" and
 * "posted, and is stuck" are the two things a standup history is read to find,
 * and collapsing them into "no green square" loses the more urgent one.
 */
export type AttendanceTone = 'posted' | 'blocked' | 'missing'

export type AttendanceCell = {
  date: string
  tone: AttendanceTone
}

export type AttendanceRow = {
  userId: string
  name: string
  cells: AttendanceCell[]
  /** Days posted out of the window, and that as a whole percent. */
  posted: number
  rate: number
}

export type AttendanceRecord = {
  userId: string
  date: string
  blocked: boolean
}

function isWeekday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day >= 1 && day <= 5
}

/**
 * The last `count` weekdays, oldest first, ending on or before `date`.
 *
 * Weekends are skipped rather than drawn as empty columns: nobody posts a
 * standup on a Sunday, so a grid that included them would be two fifths gaps
 * and would read as a much worse team than it is. A window that ends on a
 * Saturday simply ends at the Friday.
 */
export function weekdaysEndingAt(date: string, count: number): string[] {
  if (count <= 0) return []

  const dates: string[] = []
  let cursor = date
  while (dates.length < count) {
    if (isWeekday(cursor)) dates.push(cursor)
    cursor = shiftDate(cursor, -1)
  }

  return dates.reverse()
}

/**
 * Members × dates → one cell each, from the flat rows a single query returns.
 *
 * Pure, so the "a member with no rows at all is all-missing, not absent from
 * the grid" rule is unit-testable — that member is exactly the case
 * `scripts/seed.ts` plants, and the one a LEFT JOIN in SQL would have made
 * invisible.
 */
export function buildAttendanceGrid(
  members: readonly { userId: string; name: string }[],
  dates: readonly string[],
  records: readonly AttendanceRecord[],
): AttendanceRow[] {
  const byMember = new Map<string, Map<string, boolean>>()
  for (const record of records) {
    const days = byMember.get(record.userId) ?? new Map<string, boolean>()
    days.set(record.date, record.blocked)
    byMember.set(record.userId, days)
  }

  return members.map((member) => {
    const days = byMember.get(member.userId)

    const cells = dates.map((date): AttendanceCell => {
      const blocked = days?.get(date)
      if (blocked === undefined) return { date, tone: 'missing' }
      return { date, tone: blocked ? 'blocked' : 'posted' }
    })

    const posted = cells.filter((cell) => cell.tone !== 'missing').length

    return {
      userId: member.userId,
      name: member.name,
      cells,
      posted,
      rate: dates.length === 0 ? 0 : Math.round((posted / dates.length) * 100),
    }
  })
}

import type { Metadata } from 'next'

import { AttendanceMatrix } from '@/components/attendance-matrix'
import { DatePicker } from '@/components/date-picker'
import { PageHeader } from '@/components/page-header'
import { TeamFeed } from '@/components/team-feed'
import { buildAttendanceGrid, weekdaysEndingAt } from '@/lib/attendance'
import { formatDateLong, parseDateParam, todayInTimezone } from '@/lib/date'
import {
  listTeamAttendance,
  listTeamFeed,
  listTeamMembers,
} from '@/lib/queries'
import { requireMember } from '@/lib/session'

export const metadata: Metadata = { title: 'Team' }

/** SPEC §10's seed writes a fortnight, so a fortnight is what the grid shows. */
const MATRIX_DAYS = 14

export default async function TeamPage({ searchParams }: PageProps<'/team'>) {
  const { team } = await requireMember()

  const params = await searchParams
  // SPEC §6.1: an unparseable ?date= falls back to today rather than throwing,
  // and the team's timezone decides what today is — here as everywhere else.
  const date = parseDateParam(params.date, team.timezone)
  // Presence is the whole contract: an unchecked checkbox submits nothing.
  const blockersOnly = typeof params.blockers === 'string'

  const dates = weekdaysEndingAt(date, MATRIX_DAYS)

  const [entries, members, attendance] = await Promise.all([
    listTeamFeed(team.id, date, { blockersOnly }),
    // Unfiltered on purpose: the blockers filter narrows the feed, and a grid
    // that lost four of its six rows with it would be answering a different
    // question from the one it is drawn to answer.
    listTeamMembers(team.id),
    listTeamAttendance(team.id, dates),
  ])

  return (
    <>
      <PageHeader
        meta={
          <>
            <time dateTime={date}>{formatDateLong(date)}</time>
            <span aria-hidden>·</span>
            {team.timezone}
          </>
        }
        title="Team"
      />

      <DatePicker
        date={date}
        blockersOnly={blockersOnly}
        max={todayInTimezone(team.timezone)}
      />

      <AttendanceMatrix
        rows={buildAttendanceGrid(members, dates, attendance)}
        dates={dates}
        selected={date}
        blockersOnly={blockersOnly}
      />

      {/* Narrower than the grid above it: the grid is data and wants the
          width, the cards are prose and a 900px measure is unreadable. */}
      <div className="mt-7 max-w-4xl">
        <TeamFeed
          date={date}
          entries={entries}
          heading="Updates"
          emptyMessage={
            blockersOnly
              ? `No blockers reported for ${formatDateLong(date)}`
              : undefined
          }
        />
      </div>
    </>
  )
}

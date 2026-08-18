import type { Metadata } from 'next'

import { PageHeader } from '@/components/page-header'
import { TodayPanel } from '@/components/today-panel'
import { formatDateLong, todayInTimezone } from '@/lib/date'
import { listTeamFeed } from '@/lib/queries'
import { requireMember } from '@/lib/session'

export const metadata: Metadata = { title: 'Today' }

export default async function TodayPage() {
  const { user, team } = await requireMember()

  // The team's timezone decides what "today" means, here and in the action that
  // writes the row. Neither reads a date from the request.
  const date = todayInTimezone(team.timezone)
  // One query serves both surfaces: the form's pre-fill is the caller's own row
  // picked out of the feed, not a second round trip. TodayPanel does the
  // picking, because it is also what replaces that row optimistically on save.
  const entries = await listTeamFeed(team.id, date)

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
        title="Today"
      />

      <TodayPanel
        date={date}
        userId={user.id}
        userName={user.name}
        entries={entries}
      />
    </>
  )
}

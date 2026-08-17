import type { Metadata } from 'next'

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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Today</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <time dateTime={date}>{formatDateLong(date)}</time> · {team.timezone}
      </p>

      <TodayPanel date={date} userId={user.id} entries={entries} />
    </main>
  )
}

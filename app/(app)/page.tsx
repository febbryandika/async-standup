import type { Metadata } from 'next'

import { StandupForm } from '@/components/standup-form'
import { TeamFeed } from '@/components/team-feed'
import { formatDateLong, todayInTimezone } from '@/lib/date'
import { listTeamFeed } from '@/lib/queries'
import { requireMember } from '@/lib/session'

export const metadata: Metadata = { title: 'Today' }

export default async function TodayPage() {
  const { user, team } = await requireMember()

  // The team's timezone decides what "today" means, here and in the action that
  // writes the row. Neither reads a date from the request.
  const date = todayInTimezone(team.timezone)
  const entries = await listTeamFeed(team.id, date)

  // One query serves both surfaces: the form's pre-fill is the caller's own row
  // picked out of the feed, not a second round trip.
  const mine =
    entries.find((entry) => entry.userId === user.id)?.standup ?? null

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Today</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <time dateTime={date}>{formatDateLong(date)}</time> · {team.timezone}
      </p>

      <section aria-labelledby="your-update-heading" className="mt-6">
        <h2 id="your-update-heading" className="sr-only">
          Your update
        </h2>
        <StandupForm standup={mine} />
      </section>

      <TeamFeed date={date} entries={entries} />
    </main>
  )
}

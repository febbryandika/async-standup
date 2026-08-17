import type { Metadata } from 'next'

import { formatDateLong, parseDateParam, todayInTimezone } from '@/lib/date'
import { listTeamFeed } from '@/lib/queries'
import { requireMember } from '@/lib/session'
import { DatePicker } from '@/components/date-picker'
import { TeamFeed } from '@/components/team-feed'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage({ searchParams }: PageProps<'/team'>) {
  const { team } = await requireMember()

  const params = await searchParams
  // SPEC §6.1: an unparseable ?date= falls back to today rather than throwing,
  // and the team's timezone decides what today is — here as everywhere else.
  const date = parseDateParam(params.date, team.timezone)
  // Presence is the whole contract: an unchecked checkbox submits nothing.
  const blockersOnly = typeof params.blockers === 'string'

  const entries = await listTeamFeed(team.id, date, { blockersOnly })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Team</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <time dateTime={date}>{formatDateLong(date)}</time> · {team.timezone}
      </p>

      <DatePicker
        date={date}
        blockersOnly={blockersOnly}
        max={todayInTimezone(team.timezone)}
      />

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
    </main>
  )
}

import { StandupCard } from '@/components/standup-card'
import { formatDateLong } from '@/lib/date'
import type { TeamFeedEntry } from '@/lib/queries'

type TeamFeedProps = {
  date: string
  entries: TeamFeedEntry[]
}

export function TeamFeed({ date, entries }: TeamFeedProps) {
  const hasAnyUpdate = entries.some((entry) => entry.standup !== null)

  return (
    <section aria-labelledby="team-feed-heading" className="mt-10">
      <h2 id="team-feed-heading" className="text-lg font-medium">
        Team
      </h2>

      {hasAnyUpdate ? null : (
        <p className="mt-2 text-sm text-muted-foreground">
          No one has posted for {formatDateLong(date)} yet.
        </p>
      )}

      <ul className="mt-4 grid gap-4">
        {entries.map((entry) => (
          <li key={entry.userId}>
            <StandupCard name={entry.name} standup={entry.standup} />
          </li>
        ))}
      </ul>
    </section>
  )
}

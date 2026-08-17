import { StandupCard } from '@/components/standup-card'
import { formatDateLong } from '@/lib/date'
import type { TeamFeedEntry } from '@/lib/queries'

type TeamFeedProps = {
  date: string
  entries: TeamFeedEntry[]
  /** `/` labels the section "Team"; `/team` is already titled that. */
  heading?: string
  /** `/team` narrows this when the blockers filter is on. */
  emptyMessage?: string
}

export function TeamFeed({
  date,
  entries,
  heading = 'Team',
  emptyMessage,
}: TeamFeedProps) {
  // Covers the filtered case for free: with "blockers only" on and nothing to
  // show, entries is [] and [].some() is false.
  const hasAnyUpdate = entries.some((entry) => entry.standup !== null)

  return (
    <section aria-labelledby="team-feed-heading" className="mt-10">
      <h2 id="team-feed-heading" className="text-lg font-medium">
        {heading}
      </h2>

      {hasAnyUpdate ? null : (
        <p className="mt-2 text-sm text-muted-foreground">
          {emptyMessage ?? `No one has posted for ${formatDateLong(date)} yet.`}
        </p>
      )}

      <ul className="mt-4 grid gap-4">
        {entries.map((entry) => (
          <li key={entry.userId}>
            <StandupCard heading={entry.name} standup={entry.standup} />
          </li>
        ))}
      </ul>
    </section>
  )
}

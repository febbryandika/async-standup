import { EmptyState } from '@/components/empty-state'
import { StandupCard, type StandupCardEntry } from '@/components/standup-card'
import { formatDateLong } from '@/lib/date'

/**
 * The feed's own row shape, deliberately narrower than lib/queries'
 * `TeamFeedEntry`, whose `standup` is the whole Drizzle row — ids and timestamps
 * included. A query row satisfies this structurally, so `/team` still passes one
 * straight through. What the narrowing buys is `TodayPanel`'s optimistic
 * reducer: it can build the three fields a card actually renders instead of
 * forging a primary key and two timestamps that nothing reads.
 */
export type FeedEntry = {
  userId: string
  name: string
  standup: StandupCardEntry | null
}

type TeamFeedProps = {
  date: string
  entries: FeedEntry[]
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
        <div className="mt-4">
          <EmptyState
            title={
              emptyMessage ??
              `No one has posted for ${formatDateLong(date)} yet`
            }
          />
        </div>
      )}

      {/* Both can be on screen at once, and should be: SPEC §3.4 wants a card
          for every member even on a day nobody posted, so the empty state says
          "nothing here yet" while the cards below say who is missing. The list
          is dropped only when it is genuinely empty — the blockers filter — so
          the empty state does not trail four rems of nothing. */}
      {entries.length > 0 ? (
        <ul className="mt-4 grid gap-4">
          {entries.map((entry) => (
            <li key={entry.userId}>
              <StandupCard heading={entry.name} standup={entry.standup} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

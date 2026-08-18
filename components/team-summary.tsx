import { Clock, TriangleAlert } from 'lucide-react'

import { AvatarInitials } from '@/components/avatar-initials'
import type { FeedEntry } from '@/components/team-feed'

/**
 * The side rail on `/`: who is blocked, and who has not written yet. Both are
 * derived from the same `entries` array the feed renders, so the rail costs no
 * query and can never disagree with the cards beside it.
 *
 * It repeats information rather than adding any, on purpose — the feed is
 * ordered by name, which is the wrong order for the two questions a standup is
 * read to answer.
 */
export function TeamSummary({ entries }: { entries: FeedEntry[] }) {
  const blocked = entries.filter((entry) => entry.standup?.blockers)
  const missing = entries.filter((entry) => !entry.standup)

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="rail-blockers-heading"
        className="bg-card shadow-card overflow-hidden rounded-2xl border"
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <TriangleAlert
            aria-hidden
            className="text-destructive size-4"
            strokeWidth={1.9}
          />
          {/* Not "Blockers": that is the accessible name of a field in the
              composer a few hundred pixels to the left, and two things on one
              page answering to the same name is one too many — for a screen
              reader listing landmarks, and for anything else looking one of
              them up. Not "Blocked today" either: "Today" is the <h1>. */}
          <h2
            id="rail-blockers-heading"
            className="flex-1 text-sm font-semibold"
          >
            Blocked
          </h2>
          <span className="text-muted-foreground text-xs font-medium">
            {blocked.length}
          </span>
        </div>

        {blocked.length === 0 ? (
          <p className="text-muted-foreground px-4 py-4 text-sm">
            No blockers reported.
          </p>
        ) : (
          <ul className="grid gap-3 px-4 py-3.5">
            {blocked.map((entry) => (
              <li key={entry.userId} className="flex gap-2.5">
                <AvatarInitials
                  name={entry.name}
                  className="size-7 text-[0.65rem]"
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[0.8rem] font-semibold">
                    {entry.name}
                  </span>
                  <span className="text-secondary-foreground text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                    {entry.standup?.blockers}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="rail-waiting-heading"
        className="bg-card shadow-card overflow-hidden rounded-2xl border"
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Clock
            aria-hidden
            className="text-muted-foreground size-4"
            strokeWidth={1.75}
          />
          <h2
            id="rail-waiting-heading"
            className="flex-1 text-sm font-semibold"
          >
            Still waiting on
          </h2>
          <span className="text-muted-foreground text-xs font-medium">
            {missing.length}
          </span>
        </div>

        {missing.length === 0 ? (
          <p className="text-muted-foreground px-4 py-4 text-sm">
            Everyone has posted. Rare, and worth noting.
          </p>
        ) : (
          <ul className="grid gap-1 px-2 py-2">
            {missing.map((entry) => (
              <li
                key={entry.userId}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
              >
                <AvatarInitials
                  name={entry.name}
                  className="size-7 text-[0.65rem]"
                />
                <span className="truncate text-[0.8rem] font-medium">
                  {entry.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

'use client'

import { useOptimistic } from 'react'

import { StandupForm } from '@/components/standup-form'
import { TeamFeed, type FeedEntry } from '@/components/team-feed'
import type { StandupInput } from '@/lib/validation'

type TodayPanelProps = {
  date: string
  /** The signed-in user, so the reducer knows which row is theirs to replace. */
  userId: string
  entries: FeedEntry[]
}

/**
 * Replaces the caller's own row with what they just typed. A replace rather than
 * an append: `listTeamFeed` returns every member of the team, the caller
 * included, so their entry is always already there — as a posted standup or as
 * the null that renders "No update yet".
 */
function applyMyUpdate(
  entries: FeedEntry[],
  userId: string,
  values: StandupInput,
): FeedEntry[] {
  return entries.map((entry) =>
    entry.userId === userId
      ? {
          ...entry,
          standup: {
            yesterday: values.yesterday,
            today: values.today,
            // Same coercion the action does before it writes, so the optimistic
            // card and the real one agree about what an empty blockers field
            // means — no Blocker badge that vanishes a moment later.
            blockers: values.blockers || null,
          },
        }
      : entry,
  )
}

/**
 * SPEC §6.1's optimistic update. The form and the feed are siblings on `/` and
 * have to share one piece of state, so this owns both — it is the smallest
 * component that can contain them.
 *
 * It changes no data fetching: `page.tsx` still makes the single `listTeamFeed`
 * call and hands the rows down. This is a client boundary around presentation,
 * not a client data layer — nothing here fetches.
 */
export function TodayPanel({ date, userId, entries }: TodayPanelProps) {
  const [optimisticEntries, showMyUpdate] = useOptimistic(
    entries,
    (current: FeedEntry[], values: StandupInput) =>
      applyMyUpdate(current, userId, values),
  )

  // Deliberately off `entries`, not `optimisticEntries`: this only seeds the
  // form's defaultValues on mount, and reading the optimistic copy would mean
  // sourcing the fields from a value the fields themselves produced.
  const mine = entries.find((entry) => entry.userId === userId)?.standup ?? null

  return (
    <>
      <section aria-labelledby="your-update-heading" className="mt-6">
        <h2 id="your-update-heading" className="sr-only">
          Your update
        </h2>
        <StandupForm standup={mine} onOptimisticSave={showMyUpdate} />
      </section>

      <TeamFeed date={date} entries={optimisticEntries} />
    </>
  )
}

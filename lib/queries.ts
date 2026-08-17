import 'server-only'

import { and, asc, desc, eq, isNotNull, lt } from 'drizzle-orm'

import { db } from './db'
import { user } from './db/auth-schema'
import { standups, teamMembers } from './db/schema'

type Standup = typeof standups.$inferSelect

export type TeamFeedEntry = {
  userId: string
  name: string
  standup: Standup | null
}

/**
 * Every member of a team, each with their standup for `date` when they posted
 * one. The LEFT JOIN is what makes "No update yet" a null row rather than a
 * second query and a set difference in application code.
 *
 * `teamId` always comes from `requireMember()`. The join is scoped by it as
 * well as by user, so a standup can only ever be read through the team the
 * session already proved membership of.
 *
 * SPEC §3.4's "blockers only" narrows the SQL rather than the result: the page
 * has no business loading rows it is about to discard.
 */
export async function listTeamFeed(
  teamId: string,
  date: string,
  { blockersOnly = false }: { blockersOnly?: boolean } = {},
): Promise<TeamFeedEntry[]> {
  const rows = await db
    .select()
    .from(teamMembers)
    .innerJoin(user, eq(user.id, teamMembers.userId))
    .leftJoin(
      standups,
      and(
        eq(standups.userId, teamMembers.userId),
        eq(standups.teamId, teamId),
        eq(standups.date, date),
      ),
    )
    // A predicate on the right-hand table of a LEFT JOIN discards the unmatched
    // rows, collapsing it to an inner join. That collapse is the feature here:
    // a member with no standup has no blocker to show. The same condition in
    // the ON clause above would keep the outer join and hand back every member
    // as a "No update yet" card, which is the opposite of the filter.
    .where(
      blockersOnly
        ? and(eq(teamMembers.teamId, teamId), isNotNull(standups.blockers))
        : eq(teamMembers.teamId, teamId),
    )
    // id as a tiebreak: two members can share a name, and a feed that reorders
    // itself between renders is its own small bug.
    .orderBy(asc(user.name), asc(user.id))

  return rows.map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    standup: row.standups,
  }))
}

/** SPEC §3.5's page size — 14, matching the fortnight the seed writes. */
const HISTORY_PAGE_SIZE = 14

export type StandupPage = {
  items: Standup[]
  /** The last row's date, or null when this page is the end. */
  nextCursor: string | null
}

/**
 * SPEC §3.5: cursor pagination, never offset. `(userId, date)` is unique and
 * monotonic, so a cursor is both cheaper than an OFFSET scan and stable when a
 * row lands mid-read — which offset paging is not.
 *
 * Scoped by user rather than by team, and still safe: `userId` comes from
 * `requireMember()` and never from the request, and `uq_member_single_team`
 * means there is no second team whose rows this could reach.
 */
export async function listMyStandups(
  userId: string,
  before?: string,
  limit = HISTORY_PAGE_SIZE,
): Promise<StandupPage> {
  const rows = await db
    .select()
    .from(standups)
    .where(
      before
        ? and(eq(standups.userId, userId), lt(standups.date, before))
        : eq(standups.userId, userId),
    )
    .orderBy(desc(standups.date))
    // One extra row answers "is there more?" without a second COUNT.
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  // `.at(-1)` rather than `items[items.length - 1]`: its signature is already
  // `T | undefined`, so it reads the same under noUncheckedIndexedAccess. The
  // `?? null` satisfies the compiler without asserting away a case `hasMore`
  // has in fact already ruled out.
  return { items, nextCursor: hasMore ? (items.at(-1)?.date ?? null) : null }
}

import 'server-only'

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  max,
} from 'drizzle-orm'

import { db } from './db'
import { user } from './db/auth-schema'
import { standups, teamMembers } from './db/schema'
import type { AttendanceRecord } from './attendance'

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

export type TeamMemberContact = {
  userId: string
  name: string
  email: string
  role: 'member' | 'admin'
}

/**
 * Every member of a team, with the address the digest is sent to. SPEC §5.5
 * calls this `getMembersWithEmails`; renamed for the `list*` prefix the other
 * collection queries here use — `get*` is for the singletons in lib/session.ts.
 *
 * Ordered exactly like `listTeamFeed`, id tiebreak included, so the digest lists
 * people in the same order /team does. Not cosmetic: the email is that page by
 * post, and two orders read as two different teams.
 */
export async function listTeamMembers(
  teamId: string,
): Promise<TeamMemberContact[]> {
  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      // Only /team/settings reads this. It rides along rather than paying for a
      // second query, and the digest simply ignores the extra column.
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(user, eq(user.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(user.name), asc(user.id))
}

/**
 * Every standup a team posted on one date, unjoined — deliberately not
 * `listTeamFeed`'s LEFT JOIN. SPEC §5.5 hands `buildDigestHtml` members and
 * standups as two arrays, and pairing them inside that pure function is exactly
 * what the "marks missing members" unit test covers. Doing the join in SQL here
 * would move that rule somewhere no unit test can reach.
 */
export async function listTeamStandups(
  teamId: string,
  date: string,
): Promise<Standup[]> {
  return db
    .select()
    .from(standups)
    .where(and(eq(standups.teamId, teamId), eq(standups.date, date)))
}

/**
 * How many people the digest goes to. A count rather than `listTeamMembers().length`
 * because the app shell renders it on every navigation and has no use for the rows.
 */
export async function countTeamMembers(teamId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId))

  return row?.total ?? 0
}

/**
 * Whether each member posted on each of `dates`, and whether that post carried
 * a blocker. One `IN` over `idx_standup_team_date` serves both callers — the
 * 14-day grid on /team and the 10-day strip in team settings.
 *
 * Rows only for days that were posted. Pairing them back against the member
 * list is `buildAttendanceGrid`'s job, for the same reason the digest pairs its
 * own two arrays: the "never posted at all" member has to survive, and a join
 * is where that member disappears.
 */
export async function listTeamAttendance(
  teamId: string,
  dates: readonly string[],
): Promise<AttendanceRecord[]> {
  if (dates.length === 0) return []

  const rows = await db
    .select({
      userId: standups.userId,
      date: standups.date,
      blockers: standups.blockers,
    })
    .from(standups)
    .where(and(eq(standups.teamId, teamId), inArray(standups.date, [...dates])))

  return rows.map((row) => ({
    userId: row.userId,
    date: row.date,
    blocked: row.blockers !== null,
  }))
}

export type LastPosted = { userId: string; date: string | null }

/**
 * The most recent date each member posted, over all of history — not just the
 * window the grid shows, so "last posted" can honestly say "never" instead of
 * "not in the last ten weekdays".
 */
export async function listLastPosted(teamId: string): Promise<LastPosted[]> {
  return db
    .select({ userId: standups.userId, date: max(standups.date) })
    .from(standups)
    .where(eq(standups.teamId, teamId))
    .groupBy(standups.userId)
}

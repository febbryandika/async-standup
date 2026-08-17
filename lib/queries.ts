import 'server-only'

import { and, asc, eq } from 'drizzle-orm'

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
 */
export async function listTeamFeed(
  teamId: string,
  date: string,
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
    .where(eq(teamMembers.teamId, teamId))
    // id as a tiebreak: two members can share a name, and a feed that reorders
    // itself between renders is its own small bug.
    .orderBy(asc(user.name), asc(user.id))

  return rows.map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    standup: row.standups,
  }))
}

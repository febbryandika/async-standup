import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { auth } from './auth'
import { db } from './db'
import { teamMembers, teams } from './db/schema'

type SessionUser = typeof auth.$Infer.Session.user
type TeamMember = typeof teamMembers.$inferSelect
type Team = typeof teams.$inferSelect

export type Membership = {
  user: SessionUser
  member: TeamMember
  team: Team
}

/**
 * Session only — no team lookup. This is what `/onboarding` uses: calling
 * `requireMember()` there would redirect to `/onboarding` forever.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  return session.user
})

/**
 * The entry point of every authenticated page and Server Action. Nothing
 * downstream re-derives identity, and no team id is ever read from the request.
 *
 * `cache()` means the layout, the page and any action in one render share a
 * single session lookup and a single join.
 */
export const requireMember = cache(async (): Promise<Membership> => {
  const user = await requireUser()

  const row = await db
    .select()
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, user.id))
    .limit(1)
    .then((rows) => rows[0])

  if (!row) redirect('/onboarding')

  return { user, member: row.team_members, team: row.teams }
})

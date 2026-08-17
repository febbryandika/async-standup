import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
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
 * The membership join without the redirect. `/onboarding` uses this to bounce a
 * user who already has a team, which is the one place that needs to ask the
 * question rather than assert the answer.
 */
export const getMembership = cache(async (): Promise<Membership | null> => {
  const user = await requireUser()

  const row = await db
    .select()
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, user.id))
    .limit(1)
    .then((rows) => rows[0])

  if (!row) return null

  return { user, member: row.team_members, team: row.teams }
})

/**
 * The entry point of every authenticated page and Server Action. Nothing
 * downstream re-derives identity, and no team id is ever read from the request.
 *
 * `cache()` means the layout, the page and any action in one render share a
 * single session lookup and a single join.
 */
export const requireMember = cache(async (): Promise<Membership> => {
  const membership = await getMembership()
  if (!membership) redirect('/onboarding')
  return membership
})

/**
 * SPEC §8: the admin gate runs server-side, not in the UI. Both `/team/settings`
 * and `regenerateInviteCodeAction` go through here, so hiding the nav link is
 * never what is actually protecting anything.
 *
 * notFound() rather than a redirect — a member has no business knowing the
 * route exists.
 */
export const requireAdmin = cache(async (): Promise<Membership> => {
  const membership = await requireMember()
  if (membership.member.role !== 'admin') notFound()
  return membership
})

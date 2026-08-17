'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { teamMembers, teams } from '@/lib/db/schema'
import { generateInviteCode } from '@/lib/invite-code'
import { requireAdmin, requireUser } from '@/lib/session'
import {
  createTeamSchema,
  joinTeamSchema,
  type CreateTeamInput,
  type JoinTeamInput,
} from '@/lib/validation'

export type TeamState = {
  error?: string
  fieldErrors?: Partial<Record<'name' | 'timezone' | 'inviteCode', string>>
}

// SPEC §6.1: never reveal whether a code exists. Every join failure — wrong
// length, no such team — collapses to this one string, so the two are
// indistinguishable from outside.
const INVITE_CODE_INVALID = "That invite code doesn't match any team"
const CREATE_TEAM_FAILED = "We couldn't create that team. Please try again."
const JOIN_TEAM_FAILED = "We couldn't join that team. Please try again."

function fieldErrorsOf(
  issues: { path: PropertyKey[]; message: string }[],
): TeamState['fieldErrors'] {
  const fieldErrors: TeamState['fieldErrors'] = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (key === 'name' || key === 'timezone' || key === 'inviteCode') {
      fieldErrors[key] ??= issue.message
    }
  }
  return fieldErrors
}

/**
 * Drizzle wraps driver errors in a DrizzleQueryError and hangs the original pg
 * error off `.cause`, so the check has to walk the chain. node-postgres fills
 * `constraint` from the server's error payload, which is what lets one 23505 be
 * told from another.
 *
 * The iteration cap is only there so a self-referential cause cannot spin.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error, depth = 0; current && depth < 10; depth++) {
    if (
      typeof current === 'object' &&
      'code' in current &&
      current.code === '23505' &&
      'constraint' in current &&
      current.constraint === constraint
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
}

export async function createTeamAction(
  _prevState: TeamState,
  values: CreateTeamInput,
): Promise<TeamState> {
  // requireUser, not requireMember: the caller has no team yet, and
  // requireMember would bounce them straight back to /onboarding.
  const user = await requireUser()

  // Re-parsed server-side: the client resolver is a convenience, not a gate.
  const parsed = createTeamSchema.safeParse(values)
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error.issues) }
  }

  try {
    // Minted here rather than read back from RETURNING — the same createId()
    // the column defaults to. Knowing it up front makes the membership insert
    // a plain second statement.
    const teamId = createId()

    // One transaction: a membership insert that fails after the team is
    // committed would strand a team nobody belongs to and nobody can reach.
    await db.transaction(async (tx) => {
      await tx.insert(teams).values({
        id: teamId,
        ...parsed.data,
        inviteCode: generateInviteCode(),
      })

      await tx
        .insert(teamMembers)
        .values({ teamId, userId: user.id, role: 'admin' })
    })
  } catch (error) {
    // One team per user is the DB's call, not a pre-flight SELECT's: a check
    // before the insert is a race, the constraint is not. Landing here means
    // the user already had a team, so send them to it.
    if (isUniqueViolation(error, 'uq_member_single_team')) {
      redirect('/')
    }
    return { error: CREATE_TEAM_FAILED }
  }

  redirect('/') // outside the try — redirect() works by throwing
}

export async function joinTeamAction(
  _prevState: TeamState,
  values: JoinTeamInput,
): Promise<TeamState> {
  const user = await requireUser()

  const parsed = joinTeamSchema.safeParse(values)
  if (!parsed.success) {
    // Deliberately not fieldErrorsOf: "must be 6 characters" from the server
    // would be a second, distinguishable answer. The client resolver already
    // shows that hint before submit.
    return { error: INVITE_CODE_INVALID }
  }

  // Case-insensitive lookup, exact comparison: every stored code is uppercase
  // because generateInviteCode's alphabet is, so uppercasing the input is the
  // whole of it — no ilike, no functional index.
  const team = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.inviteCode, parsed.data.inviteCode.toUpperCase()))
    .limit(1)
    .then((rows) => rows[0])

  if (!team) {
    return { error: INVITE_CODE_INVALID }
  }

  try {
    await db
      .insert(teamMembers)
      .values({ teamId: team.id, userId: user.id, role: 'member' })
  } catch (error) {
    if (isUniqueViolation(error, 'uq_member_single_team')) {
      redirect('/')
    }
    return { error: JOIN_TEAM_FAILED }
  }

  redirect('/')
}

export async function regenerateInviteCodeAction(): Promise<void> {
  // The team id comes from the session. Nothing about which team is rotated is
  // read from the request.
  const { team } = await requireAdmin()

  await db
    .update(teams)
    .set({ inviteCode: generateInviteCode() })
    .where(eq(teams.id, team.id))

  revalidatePath('/team/settings')
}

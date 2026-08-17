'use server'

import { revalidatePath } from 'next/cache'

import { todayInTimezone } from '@/lib/date'
import { db } from '@/lib/db'
import { standups } from '@/lib/db/schema'
import { requireMember } from '@/lib/session'
import { standupSchema, type StandupInput } from '@/lib/validation'

export type StandupState = {
  error?: string
  fieldErrors?: Partial<Record<'yesterday' | 'today' | 'blockers', string>>
  saved?: boolean
}

const SAVE_FAILED = "We couldn't save your standup. Please try again."

function fieldErrorsOf(
  issues: { path: PropertyKey[]; message: string }[],
): StandupState['fieldErrors'] {
  const fieldErrors: StandupState['fieldErrors'] = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (key === 'yesterday' || key === 'today' || key === 'blockers') {
      fieldErrors[key] ??= issue.message
    }
  }
  return fieldErrors
}

/**
 * SPEC §5.2. Identity and date both come from the session: `values` carries the
 * three text fields and nothing else that is trusted.
 */
export async function upsertStandupAction(
  _prevState: StandupState,
  values: StandupInput,
): Promise<StandupState> {
  const { user, member, team } = await requireMember()

  // Re-parsed server-side: the client resolver is a convenience, not a gate.
  const parsed = standupSchema.safeParse(values)
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error.issues) }
  }

  // SPEC §3.2: the only source of a standup's date. Because a past date is
  // never targeted, "editable only while it's still today" is structural — an
  // edit sent after midnight simply writes today's row instead of yesterday's.
  const date = todayInTimezone(team.timezone)

  // Stored as NULL rather than '': the column is nullable, and the digest and
  // the feed both test for presence, not for emptiness.
  const blockers = parsed.data.blockers || null

  try {
    await db
      .insert(standups)
      .values({
        userId: user.id,
        teamId: member.teamId,
        date,
        ...parsed.data,
        blockers,
      })
      // uq_standup_user_date does the work. A SELECT-then-branch here would be
      // a race; the constraint is not.
      .onConflictDoUpdate({
        target: [standups.userId, standups.date],
        // updatedAt is explicit — the column defaults on insert but has no
        // $onUpdate, so an upsert would otherwise keep the original timestamp.
        set: { ...parsed.data, blockers, updatedAt: new Date() },
      })
  } catch {
    return { error: SAVE_FAILED }
  }

  revalidatePath('/')
  revalidatePath('/team')
  revalidatePath('/history')

  return { saved: true }
}

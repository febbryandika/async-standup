import 'server-only'

import { Resend } from 'resend'

import { todayInTimezone } from './date'
import { db } from './db'
import { digestSends, teams } from './db/schema'
import { buildDigestHtml, buildDigestText, digestSubject } from './digest-html'
import { listTeamMembers, listTeamStandups } from './queries'

/**
 * SPEC §5.5's send path. The bodies themselves are built in lib/digest-html.ts,
 * which imports neither this module nor anything it imports — that is what keeps
 * them unit-testable and what keeps /team/digest-preview unable to reach Resend.
 */

/**
 * SPEC §5.5 returns `{ sent }`. Widened rather than replaced: the claim row is
 * committed before the send, so a failure cannot be retried and this number is
 * the only place it is ever visible. A cron response that cannot say "one team
 * got nothing" is a cron response that lies.
 */
export type DigestResult = { sent: number; failed: number }

function requireEnv(name: 'RESEND_API_KEY' | 'DIGEST_FROM'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

/**
 * CLAUDE.md's "the digest claims before it sends", as one named function.
 *
 * Returns true when this call is the one that owns today's digest for the team.
 * `uq_digest_team_date` is the mechanism: a second insert for the same
 * (team, date) conflicts, `onConflictDoNothing().returning()` hands back zero
 * rows, and the caller skips. A "have we sent?" SELECT followed by a branch
 * would be a race between two overlapping invocations; a unique constraint is
 * not.
 *
 * Note what the row means: the team's digest was *handled* today, not that mail
 * was delivered. With no retry by design, those are the same decision.
 */
export async function claimDigest(
  teamId: string,
  date: string,
): Promise<boolean> {
  const claim = await db
    .insert(digestSends)
    .values({ teamId, date })
    .onConflictDoNothing()
    .returning({ id: digestSends.id })

  return claim.length > 0
}

export async function sendDigests(): Promise<DigestResult> {
  // Both read before the loop, and so before any claim row exists. Discovering a
  // missing variable mid-loop would burn claim rows for teams that never got
  // mail, and uq_digest_team_date makes that permanent for the day — the one
  // failure this function has no way to undo.
  const from = requireEnv('DIGEST_FROM')
  const resend = new Resend(requireEnv('RESEND_API_KEY'))

  const allTeams = await db.select().from(teams)
  let sent = 0
  let failed = 0

  for (const team of allTeams) {
    // SPEC §3.2: the team's timezone decides what today is, here as everywhere.
    // One 00:00 UTC cron means a team west of UTC is mailed during its previous
    // afternoon, for a day still in progress. SPEC §14 rules per-team send times
    // out of scope, so that follows from an accepted cut rather than a bug.
    const date = todayInTimezone(team.timezone)

    try {
      const claimed = await claimDigest(team.id, date)
      if (!claimed) continue

      const members = await listTeamMembers(team.id)
      // Nothing to send and nothing to report: an empty batch is a 422, and the
      // claim row already records that this team was handled.
      if (members.length === 0) continue

      const standups = await listTeamStandups(team.id, date)

      const html = buildDigestHtml(team.name, date, members, standups)
      const text = buildDigestText(team.name, date, members, standups)
      const subject = digestSubject(date)

      // One batch call per team. Resend caps a batch at 100 emails and rejects
      // the whole payload if any one address is invalid; that atomicity is the
      // trade for not making N requests, and UNIQUE(user_id) on team_members
      // means 100 is a ceiling this app does not approach.
      //
      // One message per member rather than one message to everyone, so nobody
      // learns their colleagues' addresses from a To: header.
      //
      // The idempotency key is Resend's own duplicate guard sitting behind our
      // claim row: if a row is ever cleared and the cron re-run inside 24h, the
      // second batch is dropped at their edge instead of mailing twice.
      const { error } = await resend.batch.send(
        members.map((member) => ({
          from,
          to: member.email,
          subject,
          html,
          text,
        })),
        { idempotencyKey: `digest/${team.id}/${date}` },
      )
      // batch.send resolves with an error rather than throwing it, so an
      // unchecked call reports success for a batch that never left the process.
      if (error) throw new Error(error.message)

      sent++
    } catch (cause) {
      // The claim row is already committed and there is deliberately no retry,
      // so this line and the `failed` count are the only record that will ever
      // exist of a lost digest. Team and date only — a recipient address has no
      // business in a log.
      failed++
      console.error(`digest failed for team ${team.id} on ${date}`, cause)
    }
  }

  return { sent, failed }
}

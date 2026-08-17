/**
 * SPEC §10 — the demo team and two weeks of standups.
 *
 * Built at build-order step 6 rather than last on purpose: every screen after
 * this one is developed against realistic data with deliberate holes in it, so
 * the empty and missing states are visible by default instead of being
 * discovered by a reviewer.
 *
 * Two properties this script is built around:
 *
 * - **Idempotent.** It truncates the seeded tables and re-inserts; it never
 *   appends. Ids come from cuid2 and Better Auth so they differ between runs,
 *   but the *content* is byte-identical — nothing here consults a clock beyond
 *   today's date, or a random number generator at all.
 * - **Never stale.** Dates are derived from now in the team's timezone, so the
 *   demo still reads as current a year after it was deployed.
 */
import { auth } from '@/lib/auth'
import { todayInTimezone } from '@/lib/date'
import { db } from '@/lib/db'
import { account, session, user, verification } from '@/lib/db/auth-schema'
import { digestSends, standups, teamMembers, teams } from '@/lib/db/schema'
import { DEFAULT_TIMEZONE } from '@/lib/timezones'

const TEAM_NAME = 'Kaizen Works'

// SPEC §10 fixes this literal, and it is deliberately not something
// `generateInviteCode` could produce: lib/invite-code.ts drops 0/O and 1/I as
// visually ambiguous, and DEMO01 contains both a zero and a one. It still
// satisfies joinTeamSchema's length-6 rule, which is all the join flow checks.
const INVITE_CODE = 'DEMO01'

/** Weekdays of history, today included. */
const WEEKDAYS = 14

// SPEC §10's "~20% of member-days missing, ~25% with blockers".
const MISSING_RATIO = 0.2
const BLOCKER_RATIO = 0.25

type Member = {
  name: string
  email: string
  role: 'admin' | 'member'
  /**
   * One line per weekday in the window, oldest first. Each day's entry becomes
   * the next day's `yesterday`, which is what makes the history read like one
   * person's work rather than a shuffled bag of sentences.
   *
   * Empty for a member who has never posted.
   */
  tasks: readonly string[]
  /** Stands in for `yesterday` on the oldest day, which has no predecessor. */
  firstDay: string
}

const MEMBERS: readonly Member[] = [
  {
    name: 'Mika Sato',
    email: 'demo@example.com',
    role: 'admin',
    firstDay:
      'Read through the spec end to end and mapped out which surfaces need a session guard',
    tasks: [
      'Sketched the session helper so every page and action resolves identity in one place instead of re-deriving it',
      'Landed requireMember() — it redirects to /login without a session and to /onboarding without a team',
      'Split requireAdmin() out of requireMember() so the settings page gates on role server-side, not just in the UI',
      'Collapsed all four sign-in failure modes into one message so we stop leaking whether an email exists',
      'Made the invite-code lookup case-insensitive by uppercasing on input instead of reaching for ilike',
      'Dropped 0/O and 1/I from the invite-code alphabet — three people misread a code in testing yesterday',
      'Wrote the onboarding branch: create a team and become admin, or join with a six-character code',
      'Added the UNIQUE(user_id) constraint on team_members so one-team-per-user is enforced by the DB, not by a check',
      "Reviewed Haruto's migration and asked him to name the constraints — anonymous ones are unreadable in error logs",
      'Moved cookie handling onto the nextCookies plugin; Server Actions call auth.api directly and were dropping Set-Cookie',
      'Regenerating an invite code now revokes the old one immediately rather than leaving both valid',
      'Paired with Lena on the register form — the Zod schema is shared with the client but re-parsed in the action',
      'Audited every query to confirm teamId comes from the session and never from a search param or form body',
      'Writing up the timezone decision for the README: the team’s zone is what defines "today", not the browser',
    ],
  },
  {
    name: 'Haruto Ishikawa',
    email: 'haruto@example.com',
    role: 'member',
    firstDay:
      'Got the local Postgres container running and sketched the table shapes on paper',
    tasks: [
      'Drafted the four tables — teams, team_members, standups, digest_sends — and generated the first migration',
      "Switched the primary keys to cuid2 via $defaultFn so ids sort by creation and don't leak a row count",
      'Added UNIQUE(user_id, date) on standups; the upsert leans on the constraint now instead of select-then-insert',
      'Added the composite index on (team_id, date) — the feed query was doing a seq scan on every date change',
      'Rewrote the feed as a LEFT JOIN so a missing standup comes back as a null row instead of a second query',
      'Set every foreign key to ON DELETE cascade and checked that deleting a team really does clear its standups',
      'Swapped the history query from OFFSET to a date cursor — offset pages drift when a row lands mid-scroll',
      "listMyStandups fetches limit + 1 to detect 'has more' without paying for a second count query",
      "nextCursor returns null on a short page, so the 'Load older' link disappears on its own",
      "Stored date as a plain YYYY-MM-DD text column rather than a timestamp — it's a calendar date, not an instant",
      'Added the id tiebreak to the feed ordering; two members sharing a first name reshuffled between renders',
      'Benchmarked the feed at 500 standups: 4ms with the composite index, 60ms without it',
      'Cleaned up the drizzle snapshot after the constraint rename so generate stops emitting a phantom diff',
      'Looking at whether digest_sends needs its own index or whether the unique constraint already covers the lookup',
    ],
  },
  {
    name: 'Lena Fischer',
    email: 'lena@example.com',
    role: 'member',
    firstDay:
      'Set up the Tailwind and shadcn baseline and checked the tokens hold up in both themes',
    tasks: [
      'Built the standup form — three textareas, useActionState, submit disabled while the write is in flight',
      'Pre-filled the form from today’s row so editing an update is the same surface as posting one',
      'Wired the textarea labels to aria-describedby so the Zod errors actually get announced, not just shown',
      'Every field has a real label now; the placeholder-as-label pass is gone',
      'Added the feed\'s empty state — "No one has posted for this date yet" beats a blank column',
      "Skeleton count comes from the real member count, so the layout doesn't shift when the data lands",
      "Made the Blocker badge carry the word 'Blocker' — the ring tint alone failed the colour-blind check",
      'Added whitespace-pre-wrap to the card fields; people type bullet lists and we were collapsing them',
      'Built the error boundary with a retry button rather than letting the route throw a bare 500',
      'An invalid ?date= now falls back to today instead of throwing — a stale bookmark should still open',
      'Went mobile-first on the form: one thumb-reachable column, since updates get posted from phones',
      'Ported the shadcn form component by hand — the radix-nova style ships an empty registry item',
      'Fixed the focus ring the CSS reset was stripping off the outline buttons',
      'Checking that "Standup saved" lands in the live region and is not only a visual change',
    ],
  },
  {
    name: 'Priya Raman',
    email: 'priya@example.com',
    role: 'member',
    firstDay:
      'Took stock of everything that has to exist before anyone can run this locally',
    tasks: [
      "Got Postgres running in Compose with a healthcheck so db:reset can't race the container",
      'Made the host port configurable via DB_PORT — half the team already has something on 5432',
      'Pinned the Postgres service container in CI to 16-alpine so it matches docker-compose',
      'CI runs lint, typecheck and test on every push, and the badge is green',
      'Added the Playwright job against a seeded service container rather than a mocked database',
      'Wired vercel.json to hit /api/cron/digest at 00:00 UTC, which is 09:00 in Tokyo',
      'The cron route rejects anything without the Bearer CRON_SECRET header — checked with a bare curl',
      'Split the env vars into what the app reads and what only the seed reads, and documented both',
      'Fixed the pnpm store cache key in CI; it missed on every run and reinstalled from scratch',
      'Confirmed drizzle-kit migrate runs cleanly against a brand new database, not just an existing one',
      'Added the db:reset script — drop, migrate, seed — so a broken local DB is one command from working',
      "Trimmed the Docker volume so a reset doesn't leave a few hundred MB of stale WAL behind",
      'Set up Vercel preview deploys and pointed them at a separate Neon branch',
      'Testing whether the Hobby cron actually fires on schedule before we promise it in the README',
    ],
  },
  {
    name: 'Tomás Ferreira',
    email: 'tomas@example.com',
    role: 'member',
    firstDay:
      'Read up on how Resend batches and on what actually survives a hostile email client',
    tasks: [
      'Started buildDigestHtml as a pure function — team name, date, members, standups in, a string out',
      'Kept the DB and Resend calls out of the builder so it stays directly unit-testable',
      "Blockers get their own section at the top; that's the part people need before standup, not after",
      "Members with no standup render as 'No update' rather than being silently dropped from the email",
      'Rebuilt the digest as a table layout — it was collapsing to a single column in Outlook',
      'Added a plain-text alternative; the HTML-only version was unreadable in a terminal client',
      "Sending claims a digest_sends row first, so a double cron invocation can't send the same digest twice",
      'The claim uses onConflictDoNothing().returning() — an empty result means today already went out',
      'Built /team/digest-preview so we can review the email without waiting for midnight to roll around',
      'Switched to Resend’s batch endpoint: one call per team instead of one per member',
      'Unit tests cover every member appearing, missing ones marked, and blockers surfacing at the top',
      'Playwright now walks register, create team, post an update, and see it land in the feed',
      'Added the axe-core assertion on / and /team; it fails CI on serious violations',
      'Chasing a flake where the edit test sees two cards instead of one updated card',
    ],
  },
  {
    // SPEC §10: one member has never posted at all. Ren joined last week, which
    // makes the gap read as onboarding rather than as missing data.
    name: 'Ren Takahashi',
    email: 'ren@example.com',
    role: 'member',
    firstDay: '',
    tasks: [],
  },
]

const BLOCKERS: readonly string[] = [
  'Blocked on the Resend domain verification — the DNS record is still propagating',
  "Need a decision on whether a late edit writes yesterday's row or today's before I can finish the form",
  "Waiting on review for the migration — I don't want to generate a second one on top of an unmerged rename",
  'The Neon branch for previews hit its connection limit; asked for the pooled connection string',
  "Can't reproduce the Playwright flake locally — it only fails on CI's slower runner",
  'Stuck on the cookie not being set when the action calls auth.api directly. Pairing with Mika after standup',
  'Waiting on CRON_SECRET landing in the Vercel project before I can test a scheduled invocation',
  "The invite code screen needs a copy decision — 'regenerate' reads like it might not revoke the old code",
  'Docker here refuses to bind 5432. Working around it locally, but we should make the port configurable',
  'Blocked on which timezone the digest uses for a member who travels — needs a call, not a guess',
  "typecheck is failing on a Next generated type I can't find the source of. Still digging",
  'Need someone to confirm the axe violation on the date picker is real and not a false positive',
]

/**
 * Deterministic 0..1 from a pair of indices. Integer math throughout, so it
 * cannot drift between platforms the way a sin-based hash can — and unlike
 * Math.random() it keeps two consecutive runs identical, which is the whole
 * idempotency requirement.
 */
function hash(a: number, b: number): number {
  let x = Math.imul(a, 73856093) ^ Math.imul(b, 19349663)
  x = Math.imul(x ^ (x >>> 16), 2246822507)
  x = Math.imul(x ^ (x >>> 13), 3266489909)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

/**
 * The last `count` weekdays up to and including today in `timeZone`, oldest
 * first.
 *
 * Steps the cursor in UTC for the same reason `formatDateLong` formats in UTC:
 * a YYYY-MM-DD string is a calendar date, and re-interpreting it in a zone is
 * what makes dates slide by one. Lives here rather than in lib/date.ts because
 * nothing else needs it.
 */
function recentWeekdays(timeZone: string, count: number): string[] {
  const dates: string[] = []
  const cursor = new Date(`${todayInTimezone(timeZone)}T00:00:00Z`)

  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return dates.reverse()
}

type Slot = { memberIndex: number; dayIndex: number }

const slotKey = ({ memberIndex, dayIndex }: Slot) =>
  `${memberIndex}:${dayIndex}`

/**
 * Ranks every slot by a salted hash and takes an exact slice, rather than
 * testing each slot against a threshold. On ~65 samples a threshold lands
 * anywhere between 12% and 27%, and SPEC §10's proportions are the point of
 * the exercise — so the count is chosen, not hoped for.
 */
function pickSlots(slots: readonly Slot[], ratio: number, salt: number) {
  return new Set(
    [...slots]
      .sort(
        (a, b) =>
          hash(a.memberIndex, a.dayIndex + salt) -
          hash(b.memberIndex, b.dayIndex + salt),
      )
      .slice(0, Math.round(slots.length * ratio))
      .map(slotKey),
  )
}

async function main() {
  // SPEC §10: runnable once against the demo deployment on purpose, never by
  // accident.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SEED_ALLOW_PROD !== '1'
  ) {
    console.error(
      'Refusing to seed a production database. Set SEED_ALLOW_PROD=1 to override.',
    )
    process.exit(1)
  }

  const password = process.env.DEMO_PASSWORD
  if (!password) {
    console.error('DEMO_PASSWORD is not set — see .env.example')
    process.exit(1)
  }

  const dates = recentWeekdays(DEFAULT_TIMEZONE, WEEKDAYS)
  const posting = MEMBERS.filter((member) => member.tasks.length > 0)

  // Catches a miscounted content array here, with a readable message, rather
  // than as a NOT NULL violation several hundred lines of SQL later.
  for (const member of posting) {
    if (member.tasks.length !== WEEKDAYS) {
      throw new Error(
        `${member.name} has ${member.tasks.length} tasks, expected ${WEEKDAYS}`,
      )
    }
  }

  // SPEC §10: today is only partially filled. Forced rather than left to the
  // hash, so the "No update yet" cards are guaranteed to be on screen — and
  // deliberately not the demo account, so a reviewer who signs in lands on an
  // empty form they can post from, which is the loop the app exists for.
  const todayPosters: readonly number[] = [2, 3]
  const todayBlocked = 3

  // Idempotency, and the reason it is a truncate rather than an upsert: the
  // demo is defined by this file, so anything already in these tables is a
  // previous run or hand-made test data. Every FK cascades, so the explicit
  // order is belt-and-braces — but a `signUpEmail` colliding on
  // user_email_unique is exactly the failure this prevents.
  await db.delete(standups)
  await db.delete(digestSends)
  await db.delete(teamMembers)
  await db.delete(teams)
  await db.delete(session)
  await db.delete(account)
  await db.delete(verification)
  await db.delete(user)

  const [team] = await db
    .insert(teams)
    .values({
      name: TEAM_NAME,
      inviteCode: INVITE_CODE,
      timezone: DEFAULT_TIMEZONE,
    })
    .returning()
  if (!team) throw new Error('Failed to insert the demo team')

  // SPEC §10: through Better Auth's own signup API, so the password hash is
  // real rather than hand-rolled. No `headers` argument — the nextCookies
  // plugin tolerates being called outside a request scope, but only if it is
  // not handed request headers to work with.
  const userIds = new Map<string, string>()
  for (const member of MEMBERS) {
    const created = await auth.api.signUpEmail({
      body: { name: member.name, email: member.email, password },
    })
    userIds.set(member.email, created.user.id)
  }

  await db.insert(teamMembers).values(
    MEMBERS.map((member) => ({
      teamId: team.id,
      userId: userIds.get(member.email)!,
      role: member.role,
    })),
  )

  const pastSlots: Slot[] = []
  for (let memberIndex = 0; memberIndex < posting.length; memberIndex++) {
    for (let dayIndex = 0; dayIndex < dates.length - 1; dayIndex++) {
      pastSlots.push({ memberIndex, dayIndex })
    }
  }

  const missing = pickSlots(pastSlots, MISSING_RATIO, 0)
  const postedSlots = pastSlots.filter((slot) => !missing.has(slotKey(slot)))
  const blocked = pickSlots(postedSlots, BLOCKER_RATIO, 1000)

  const rows = []
  for (let memberIndex = 0; memberIndex < posting.length; memberIndex++) {
    const member = posting[memberIndex]!
    const userId = userIds.get(member.email)!

    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      const isToday = dayIndex === dates.length - 1
      const key = slotKey({ memberIndex, dayIndex })

      const posted = isToday
        ? todayPosters.includes(memberIndex)
        : !missing.has(key)
      if (!posted) continue

      const hasBlocker = isToday
        ? memberIndex === todayBlocked
        : blocked.has(key)

      rows.push({
        userId,
        teamId: team.id,
        date: dates[dayIndex]!,
        yesterday:
          dayIndex === 0 ? member.firstDay : member.tasks[dayIndex - 1]!,
        today: member.tasks[dayIndex]!,
        // Stored as NULL rather than '', matching upsertStandupAction: the feed
        // and the digest both test for presence, not for emptiness.
        blockers: hasBlocker
          ? BLOCKERS[
              Math.floor(hash(memberIndex, dayIndex + 500) * BLOCKERS.length)
            ]!
          : null,
      })
    }
  }

  // One statement — the table was just emptied, so there is no conflict to
  // resolve and an onConflictDoUpdate here would imply one that cannot happen.
  await db.insert(standups).values(rows)

  const memberDays = posting.length * dates.length
  const withBlockers = rows.filter((row) => row.blockers !== null).length
  const neverPosted = MEMBERS.filter((member) => member.tasks.length === 0)

  console.log(
    `Seeded ${TEAM_NAME} (${DEFAULT_TIMEZONE}, invite code ${INVITE_CODE})`,
  )
  console.log(
    `  ${MEMBERS.length} members · ${rows.length} standups · ${dates[0]} → ${dates[dates.length - 1]}`,
  )
  console.log(
    `  ${memberDays - rows.length} member-days with no update · ${withBlockers} with blockers · ${neverPosted
      .map((member) => member.name)
      .join(', ')} has never posted`,
  )
  console.log(`  Sign in as ${MEMBERS[0]!.email}`)
}

// lib/db does not export the pool, so nothing can close it and the process
// would otherwise sit open after the last insert.
main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })

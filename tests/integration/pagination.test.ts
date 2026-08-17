import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { user } from '@/lib/db/auth-schema'
import { standups, teams } from '@/lib/db/schema'
import { listMyStandups } from '@/lib/queries'

// The fixture inserts its own rows rather than leaning on scripts/seed.ts:
// SPEC §10's seed truncates every table, so a test built on it would be one
// `pnpm db:seed` away from deleting a reviewer's demo data.
//
// Hyphenated ids on purpose — cuid2 emits lowercase alphanumerics only, so
// nothing the app or the seed writes can collide with these. Likewise the
// .invalid email (a reserved TLD) and the invite code's 'I', which
// lib/invite-code.ts excludes from its alphabet.
const USER_ID = 'test-history-user'
const TEAM_ID = 'test-history-team'
const EMAIL = 'history-fixture@test.invalid'
const INVITE_CODE = 'TSTHIS'

// 2020 rather than "recent": the seed writes the last 14 weekdays, and a
// fixture overlapping it would turn a bleed into a pagination failure.
const DATES = Array.from(
  { length: 12 },
  (_, index) => `2020-01-${String(index + 1).padStart(2, '0')}`,
)
const NEWEST_FIRST = [...DATES].reverse()
const PAGE = 5

async function removeFixture(): Promise<void> {
  // ON DELETE cascade from either parent clears the standups; naming both
  // means the cleanup does not depend on which cascade fires first.
  await db.delete(user).where(eq(user.id, USER_ID))
  await db.delete(teams).where(eq(teams.id, TEAM_ID))
}

beforeAll(async () => {
  // Up front as well as in afterAll: a run killed mid-test would otherwise
  // leave rows that make every later run fail on the primary key rather than
  // on the assertion.
  await removeFixture()

  await db
    .insert(user)
    .values({ id: USER_ID, name: 'History Fixture', email: EMAIL })
  await db
    .insert(teams)
    .values({ id: TEAM_ID, name: 'History Fixture', inviteCode: INVITE_CODE })
  // No team_members row: listMyStandups is keyed by user, and
  // uq_member_single_team is the one constraint an unnecessary membership
  // could trip.
  await db.insert(standups).values(
    DATES.map((date) => ({
      userId: USER_ID,
      teamId: TEAM_ID,
      date,
      yesterday: `yesterday ${date}`,
      today: `today ${date}`,
      blockers: null,
    })),
  )
})

afterAll(async () => {
  await removeFixture()
  // Drizzle keeps the pg.Pool on `$client` and nothing else can reach it. An
  // open pool holds the worker process open past the last assertion.
  await db.$client.end()
})

// SPEC §12: nextCursor only when more rows exist, and never a repeated row.
describe('listMyStandups', () => {
  it('returns a null nextCursor on the last page', async () => {
    const first = await listMyStandups(USER_ID, undefined, PAGE)
    expect(first.items.map((row) => row.date)).toEqual(NEWEST_FIRST.slice(0, 5))
    expect(first.nextCursor).toBe(NEWEST_FIRST[4])

    const second = await listMyStandups(USER_ID, first.nextCursor!, PAGE)
    expect(second.items.map((row) => row.date)).toEqual(
      NEWEST_FIRST.slice(5, 10),
    )
    expect(second.nextCursor).toBe(NEWEST_FIRST[9])

    const last = await listMyStandups(USER_ID, second.nextCursor!, PAGE)
    expect(last.items.map((row) => row.date)).toEqual(NEWEST_FIRST.slice(10))
    expect(last.nextCursor).toBeNull()
  })

  it('returns a null nextCursor when the last page is exactly full', async () => {
    // The boundary the `limit + 1` fetch exists for. With rows === limit, a
    // `>=` test would hand back a cursor to an empty page and render "Load
    // older" on a page with nothing after it.
    const page = await listMyStandups(USER_ID, undefined, DATES.length)

    expect(page.items).toHaveLength(DATES.length)
    expect(page.nextCursor).toBeNull()
  })

  it('never repeats a row across pages', async () => {
    const seen: string[] = []
    let cursor: string | undefined

    // Bounded rather than `while (cursor)`: a nextCursor that never goes null
    // should fail the suite, not hang it.
    for (let request = 0; request <= DATES.length; request++) {
      const page = await listMyStandups(USER_ID, cursor, PAGE)
      seen.push(...page.items.map((row) => row.date))
      if (page.nextCursor === null) break
      cursor = page.nextCursor
    }

    expect(new Set(seen).size).toBe(seen.length) // nothing twice …
    expect(seen).toEqual(NEWEST_FIRST) // … and nothing missed
  })
})

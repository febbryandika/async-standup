import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { digestSends, teams } from '@/lib/db/schema'
import { claimDigest } from '@/lib/digest'

// Its own team rather than the seed's, for the reason tests/integration/
// pagination.test.ts gives: SPEC §10's seed truncates, so a test built on it
// would be one `pnpm db:seed` away from deleting a reviewer's demo data.
//
// Hyphenated id and an 'I' in the invite code so nothing cuid2 or
// lib/invite-code.ts can emit will ever collide with the fixture.
const TEAM_ID = 'test-digest-team'
const INVITE_CODE = 'TSTDIG'

// 2020, well clear of the fortnight the seed writes.
const DATE = '2020-02-03'
const OTHER_DATE = '2020-02-04'
const RACE_DATE = '2020-02-05'

async function removeFixture(): Promise<void> {
  // ON DELETE cascade from teams clears the digest_sends rows with it.
  await db.delete(teams).where(eq(teams.id, TEAM_ID))
}

beforeAll(async () => {
  await removeFixture()
  await db
    .insert(teams)
    .values({ id: TEAM_ID, name: 'Digest Fixture', inviteCode: INVITE_CODE })
})

afterAll(async () => {
  await removeFixture()
  // Drizzle keeps the pg.Pool on `$client`; an open pool holds the worker open
  // past the last assertion.
  await db.$client.end()
})

// CLAUDE.md's "the digest claims before it sends". The behaviour lives in
// uq_digest_team_date rather than in application logic, which is why it is here
// and not in the unit project — and it needs no mail transport to assert.
describe('claimDigest', () => {
  it('succeeds once, then reports the day as already claimed', async () => {
    expect(await claimDigest(TEAM_ID, DATE)).toBe(true)
    expect(await claimDigest(TEAM_ID, DATE)).toBe(false)

    const rows = await db
      .select()
      .from(digestSends)
      .where(and(eq(digestSends.teamId, TEAM_ID), eq(digestSends.date, DATE)))

    expect(rows).toHaveLength(1)
  })

  it('claims each date independently', async () => {
    expect(await claimDigest(TEAM_ID, OTHER_DATE)).toBe(true)
  })

  it('lets exactly one of three concurrent claims through', async () => {
    // The assertion a "have we sent?" SELECT followed by a branch cannot pass,
    // and the reason idempotency lives in the constraint rather than in a query:
    // three overlapping invocations, one digest.
    const claims = await Promise.all([
      claimDigest(TEAM_ID, RACE_DATE),
      claimDigest(TEAM_ID, RACE_DATE),
      claimDigest(TEAM_ID, RACE_DATE),
    ])

    expect(claims.filter(Boolean)).toHaveLength(1)
  })
})

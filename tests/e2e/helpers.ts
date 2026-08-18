import { randomUUID } from 'node:crypto'

import { expect, type Page } from '@playwright/test'

/**
 * SPEC §12's flow tests share one shape: become a brand new person, get a team,
 * post something, then look at the feed. These are the four steps of that, so
 * each spec reads as the flow it is testing rather than as a pile of fills.
 *
 * Every account is created at runtime. Nothing here signs in as the seeded demo
 * user, and nothing here writes to the seeded team — the flow specs and
 * a11y.spec.ts (which does sign in as demo, read-only) touch disjoint rows, so
 * the two can run in either order, or alone.
 */

export type Account = {
  name: string
  email: string
  password: string
}

/**
 * A fresh identity per call, and specifically not per module: `retries` is 2 in
 * CI, and a failed attempt has already created its user. A constant computed at
 * import time would collide on `user_email_unique` on every retry, turning one
 * flake into three failures that all look like a registration bug.
 *
 * example.com is reserved by RFC 2606, so these addresses can never reach a real
 * inbox. The integration fixtures use .invalid for the same reason; here the
 * address has to survive `registerSchema`'s Zod email check first, and a
 * conventional TLD is the version with no doubt in it.
 */
export function newAccount(label: string): Account {
  const suffix = randomUUID().slice(0, 8)
  return {
    name: `${label} ${suffix}`,
    email: `${label}-${suffix}@example.com`,
    password: 'e2e-password',
  }
}

export async function register(page: Page, account: Account): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('Name').fill(account.name)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  // signUpAction redirects here, and a user with no team is exactly what
  // requireMember() sends to /onboarding anyway.
  await page.waitForURL('**/onboarding')
}

/** From /onboarding. Timezone is left at its Asia/Tokyo default. */
export async function createTeam(page: Page, teamName: string): Promise<void> {
  await page.getByLabel('Team name').fill(teamName)
  await page.getByRole('button', { name: 'Create team' }).click()
  await page.waitForURL(/\/$/)
}

/** From /onboarding. */
export async function joinTeam(page: Page, inviteCode: string): Promise<void> {
  await page.getByLabel('Invite code').fill(inviteCode)
  await page.getByRole('button', { name: 'Join team' }).click()
  await page.waitForURL(/\/$/)
}

/**
 * Admin-only surface, so the caller has to be the member who created the team.
 *
 * Matched on the shape of the text rather than on `p.font-mono`: the class is a
 * styling decision that a redesign is entitled to change, while "six uppercase
 * alphanumerics" is what an invite code *is* (lib/invite-code.ts). No test id —
 * the app ships no markup that exists only for tests.
 */
export async function readInviteCode(page: Page): Promise<string> {
  await page.goto('/team/settings')
  await expect(page.getByRole('heading', { name: 'Invite code' })).toBeVisible()

  const code = (
    await page
      .getByText(/^[A-Z0-9]{6}$/)
      .first()
      .innerText()
  ).trim()

  expect(code).toMatch(/^[A-Z0-9]{6}$/)
  return code
}

/** From /. Waits on the live region rather than a timeout. */
export async function postStandup(
  page: Page,
  fields: { yesterday: string; today: string; blockers?: string },
): Promise<void> {
  // exact, because getByLabel substring-matches: "Today" would also reach
  // "Yesterday", and "Blockers" the blockers-only toggle on /team.
  await page.getByLabel('Yesterday').fill(fields.yesterday)
  await page.getByLabel('Today', { exact: true }).fill(fields.today)
  await page.getByLabel('Blockers', { exact: true }).fill(fields.blockers ?? '')
  await page.getByRole('button', { name: 'Save standup' }).click()

  await expect(page.getByText('Standup saved')).toBeVisible()
}

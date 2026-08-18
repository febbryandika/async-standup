import { expect, test } from '@playwright/test'

import { createTeam, newAccount, postStandup, register } from './helpers'

/**
 * SPEC §12's three standup flows, on the surface they all share: `/`, which is
 * the form and the team feed on one page.
 *
 * Each test builds its own team from a registration, so none of them reads or
 * writes the seeded "Kaizen Works" rows. That is what makes them order-free —
 * there is no state to leak between them, and `pnpm db:seed` between runs is
 * neither required nor harmful.
 */

test('register, create a team, post a standup and see it in the team feed', async ({
  page,
}) => {
  const account = newAccount('poster')
  await register(page, account)
  await createTeam(page, 'Flow Works')

  await postStandup(page, {
    yesterday: 'Finished the cursor pagination on history',
    today: 'Wiring the digest preview to the same builder',
    blockers: 'Need the Resend sending domain verified',
  })

  const feed = page.getByRole('region', { name: 'Team' })
  await expect(
    feed.getByRole('heading', { level: 3, name: account.name }),
  ).toBeVisible()
  await expect(
    feed.getByText('Wiring the digest preview to the same builder'),
  ).toBeVisible()

  // SPEC §6.2: the badge's text is the signal. `exact` because the card also
  // carries a "Blockers" field label.
  await expect(feed.getByText('Blocker', { exact: true })).toBeVisible()

  // The feed updates optimistically (SPEC §6.1), so the card is on screen before
  // the write lands. Reloading is what separates "rendered" from "stored".
  await page.reload()
  await expect(
    feed.getByText('Wiring the digest preview to the same builder'),
  ).toBeVisible()

  // "appears in the team feed" is also literally /team, which reads the same row
  // through a different query.
  await page.goto('/team')
  await expect(
    page
      .getByRole('region', { name: 'Updates' })
      .getByText('Wiring the digest preview to the same builder'),
  ).toBeVisible()
})

test('editing today’s standup replaces the card instead of adding a second one', async ({
  page,
}) => {
  const account = newAccount('editor')
  await register(page, account)
  await createTeam(page, 'Amend Works')

  await postStandup(page, {
    yesterday: 'Drafted the digest template',
    today: 'FIRST: reading through the seed script',
  })

  // Reload so the form re-mounts from today's stored row, which is the path a
  // person actually takes when they come back to amend an update.
  await page.reload()
  await expect(page.getByLabel('Today', { exact: true })).toHaveValue(
    'FIRST: reading through the seed script',
  )

  await postStandup(page, {
    yesterday: 'Drafted the digest template',
    today: 'SECOND: rewrote the seed script',
  })

  await page.reload()

  const feed = page.getByRole('region', { name: 'Team' })

  // The upsert assertion. A second insert would show as a second card for the
  // same person, so the counts are the test and the text is the confirmation.
  await expect(
    feed.getByRole('heading', { level: 3, name: account.name }),
  ).toHaveCount(1)
  await expect(feed.getByRole('listitem')).toHaveCount(1)
  await expect(feed.getByText('SECOND: rewrote the seed script')).toBeVisible()
  await expect(
    feed.getByText('FIRST: reading through the seed script'),
  ).toHaveCount(0)
})

test('a fresh team shows the empty feed rather than a blank page', async ({
  page,
}) => {
  const account = newAccount('newcomer')
  await register(page, account)
  await createTeam(page, 'Quiet Works')

  // SPEC §6.1's empty cell for the standup form.
  await expect(page.getByText(/Your first update/)).toBeVisible()

  const feed = page.getByRole('region', { name: 'Team' })
  await expect(feed.getByText(/^No one has posted for .+ yet$/)).toBeVisible()

  // SPEC §3.4 wants a card for every member even on a day nobody posted, so the
  // empty state and the member's own "No update yet" card are both correct here.
  await expect(feed.getByRole('listitem')).toHaveCount(1)
  await expect(feed.getByText('No update yet')).toBeVisible()

  await page.goto('/team')
  await expect(
    page
      .getByRole('region', { name: 'Updates' })
      .getByText(/^No one has posted for .+ yet$/),
  ).toBeVisible()
})

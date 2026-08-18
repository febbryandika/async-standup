import { expect, test } from '@playwright/test'

import {
  createTeam,
  joinTeam,
  newAccount,
  postStandup,
  readInviteCode,
  register,
} from './helpers'

/**
 * SPEC §12's invite-code flow. Two people, so two browser contexts: sessions are
 * cookies, and one context cannot hold two of them. Both are created and closed
 * inside the test, so this spec still owns everything it touches.
 */

test('a second user joins by invite code and sees both standups', async ({
  browser,
}) => {
  const admin = newAccount('admin')
  const joiner = newAccount('joiner')

  const adminContext = await browser.newContext()
  const joinerContext = await browser.newContext()

  try {
    const adminPage = await adminContext.newPage()
    await register(adminPage, admin)
    await createTeam(adminPage, 'Invite Works')
    await postStandup(adminPage, {
      yesterday: 'Set the team up',
      today: 'ADMIN: reviewing the digest layout',
    })

    // The code is only reachable from /team/settings, which requireAdmin()
    // guards — so reading it here also exercises that the team's creator is its
    // admin (SPEC §3.1).
    const code = await readInviteCode(adminPage)

    const joinerPage = await joinerContext.newPage()
    await register(joinerPage, joiner)
    await joinTeam(joinerPage, code)
    await postStandup(joinerPage, {
      yesterday: 'Onboarded to the team',
      today: 'JOINER: picking up the history page',
    })

    await joinerPage.reload()
    const joinerFeed = joinerPage.getByRole('region', { name: 'Team' })
    await expect(joinerFeed.getByRole('listitem')).toHaveCount(2)
    await expect(
      joinerFeed.getByRole('heading', { level: 3, name: admin.name }),
    ).toBeVisible()
    await expect(
      joinerFeed.getByRole('heading', { level: 3, name: joiner.name }),
    ).toBeVisible()
    await expect(
      joinerFeed.getByText('ADMIN: reviewing the digest layout'),
    ).toBeVisible()
    await expect(
      joinerFeed.getByText('JOINER: picking up the history page'),
    ).toBeVisible()

    // The join has to be visible from both sides, or it is a read bug wearing a
    // write bug's clothes. goto rather than reload: readInviteCode left this
    // page on /team/settings, which has no feed on it.
    await adminPage.goto('/')
    await expect(
      adminPage.getByRole('region', { name: 'Team' }).getByRole('listitem'),
    ).toHaveCount(2)
  } finally {
    await adminContext.close()
    await joinerContext.close()
  }
})

test('a wrong invite code is refused without revealing whether it exists', async ({
  page,
}) => {
  const account = newAccount('stranger')
  await register(page, account)

  // Well-formed on purpose: joinTeamSchema only checks the length, so a
  // six-character code reaches the lookup instead of failing validation first.
  // That is the path SPEC §6.1's message is about. One code in ~1.07e9 collides.
  await page.getByLabel('Invite code').fill('ZZZZZZ')
  await page.getByRole('button', { name: 'Join team' }).click()

  // SPEC §6.1: one message for "no such code", with nothing in it that
  // distinguishes a code that exists from one that never did.
  await expect(
    page.getByText("That invite code doesn't match any team"),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/onboarding$/)
})

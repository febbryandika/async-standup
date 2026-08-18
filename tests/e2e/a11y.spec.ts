import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

// SPEC §6.2 — the accessibility pass, as assertions rather than as a claim in a
// README. Needs the app's own database behind it: `docker compose up -d` and
// `pnpm db:seed`, so `/` and `/team` render the seeded team rather than an
// empty state. The empty page is a legitimate surface, but it is not the one
// with the Blocker badges, the "No update yet" cards and the date picker on it.

/**
 * SPEC §10's one-click demo login. Going through the button rather than filling
 * the fields keeps this test on the same path a reviewer takes, so a broken
 * demo button fails here instead of in front of them.
 */
async function signInWithDemo(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Use demo account' }).click()
  await page.waitForURL('/')
}

/**
 * Scoped to the standard. axe also ships a `best-practice` ruleset — its own
 * house opinions rather than anything WCAG requires — and gating on those would
 * fail the build for reasons SPEC §6.2 never asked for. wcag22aa is in for
 * `target-size`, which is directly relevant to the blockers checkbox, though axe
 * usually returns that one as `incomplete` rather than a violation.
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * `impact` is axe's own severity. SPEC §6.2 draws the CI line at "serious", and
 * "critical" sits above it — filtering to both is what that sentence means.
 * Nothing is disabled by rule id: pre-disabling a rule is how an accessibility
 * gate turns into decoration.
 *
 * The parameter type is inferred rather than imported. `axe-core` is a
 * transitive dependency and pnpm does not hoist it, so `import type { Result }
 * from 'axe-core'` does not resolve from here and would fail `pnpm typecheck`.
 */
function seriousViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string[] {
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} — ${v.nodes
          .map((node) => node.target.join(' '))
          .join(', ')}`,
    )
}

/**
 * Tab from wherever focus is until it lands on `target`. Written as a search
 * rather than a fixed count because the nav sits above every one of these
 * fields, and a test that breaks when a nav link is added is testing the nav.
 */
async function tabTo(page: Page, target: Locator, limit = 25): Promise<void> {
  // Before the first Tab, not as a formality. These routes stream behind
  // app/(app)/loading.tsx, and React delivers the real markup inside a
  // `<div hidden>` that inline script relocates once the boundary resolves.
  // page.goto resolves on `load`, which can land while the skeleton is still on
  // screen — and a form parked in that hidden div is in the DOM but not in the
  // tab order, so the search below walks the nav twice and gives up. Waiting on
  // visibility is waiting for the swap.
  await expect(target).toBeVisible()

  for (let step = 0; step < limit; step++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((node) => node === document.activeElement)) return
  }
  throw new Error(`Focus never reached the target within ${limit} tabs`)
}

/**
 * Focus alone is not the requirement — SPEC §6.2 says visible focus rings are
 * never removed, and `:focus-visible` is the selector every primitive in
 * components/ui hangs its ring on. Reached by keyboard, so the pseudo-class
 * genuinely applies; a programmatic .focus() would not set it.
 */
async function expectFocusedAndVisible(target: Locator): Promise<void> {
  await expect(target).toBeFocused()
  await expect(
    target.evaluate((node) => node.matches(':focus-visible')),
  ).resolves.toBe(true)
}

test.beforeEach(async ({ page }) => {
  await signInWithDemo(page)
})

test.describe('axe', () => {
  test('/ has no serious accessibility violations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG)
      .analyze()
    expect(seriousViolations(violations)).toEqual([])
  })

  test('/team has no serious accessibility violations', async ({ page }) => {
    await page.goto('/team')
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG)
      .analyze()
    expect(seriousViolations(violations)).toEqual([])
  })

  // The blockers filter is a different page: the feed collapses to the rows with
  // a Blocker badge, which is the surface where "text, not colour" has to hold.
  test('/team filtered to blockers has no serious violations', async ({
    page,
  }) => {
    await page.goto('/team?blockers=on')
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG)
      .analyze()
    expect(seriousViolations(violations)).toEqual([])
  })

  // The dark palette is a second set of colours behind the same markup, so the
  // only rules it can newly fail are the contrast ones — which is exactly why
  // it needs a run of its own. The theme is a cookie read by the root layout,
  // so setting it is the whole setup.
  test('/ has no serious violations in the dark theme', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: 'theme', value: 'dark', url: 'http://localhost:3000' },
    ])
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()

    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG)
      .analyze()
    expect(seriousViolations(violations)).toEqual([])
  })
})

test.describe('keyboard path', () => {
  // SPEC §6.2's primary flow, first half: tab to the fields, then the submit.
  test('/ reaches every standup field and the submit', async ({ page }) => {
    await page.goto('/')

    const yesterday = page.getByLabel('Yesterday')
    await tabTo(page, yesterday)
    await expectFocusedAndVisible(yesterday)

    await page.keyboard.press('Tab')
    await expectFocusedAndVisible(page.getByLabel('Today', { exact: true }))

    await page.keyboard.press('Tab')
    await expectFocusedAndVisible(page.getByLabel('Blockers', { exact: true }))

    await page.keyboard.press('Tab')
    await expectFocusedAndVisible(
      page.getByRole('button', { name: 'Save standup' }),
    )
  })

  // Second half: the date picker and the toggle, and the toggle actually
  // toggling — Space on a checkbox is the interaction, not a click.
  test('/team reaches the date picker and the blockers toggle', async ({
    page,
  }) => {
    await page.goto('/team')

    // exact, because getByLabel substring-matches and the feed's own region is
    // labelled "Updates" — which contains "date".
    const date = page.getByLabel('Date', { exact: true })
    await tabTo(page, date)
    await expectFocusedAndVisible(date)

    // A search, not a single press: a native date input holds its own internal
    // stops (day, month, year) that Tab walks before it leaves the field. That
    // is the browser's keyboard model, not something to route around.
    const blockers = page.getByLabel('Blockers only', { exact: true })
    await tabTo(page, blockers)
    await expectFocusedAndVisible(blockers)

    // Space is how a checkbox is operated from the keyboard, and here it also
    // drives a soft navigation.
    await page.keyboard.press('Space')
    await page.waitForURL(/blockers=on/)
    await expect(blockers).toBeChecked()

    // Focus survives that navigation, so tabbing carries on from the toggle
    // rather than restarting at the top of the document.
    await expect(blockers).toBeFocused()

    await page.keyboard.press('Tab')
    await expectFocusedAndVisible(page.getByRole('button', { name: 'Apply' }))
  })
})

test.describe('mobile', () => {
  const IPHONE_WIDTH = 375

  // SPEC §6.2: "the standup form is a single column and thumb-reachable, since
  // updates get posted from phones."
  test('the standup form is one column at 375px', async ({ page }) => {
    await page.setViewportSize({ width: IPHONE_WIDTH, height: 812 })
    await page.goto('/')

    // Same streaming swap as tabTo: boundingBox() is null while the form is
    // still inside the hidden staging div.
    await expect(page.getByLabel('Yesterday')).toBeVisible()

    const yesterday = await page.getByLabel('Yesterday').boundingBox()
    const today = await page.getByLabel('Today', { exact: true }).boundingBox()
    expect(yesterday).not.toBeNull()
    expect(today).not.toBeNull()

    // Same left edge and same width means stacked, not side by side.
    expect(today?.x).toBe(yesterday?.x)
    expect(today?.width).toBe(yesterday?.width)

    // A page that scrolls sideways on a phone has a layout that does not fit,
    // whatever the columns are doing.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflows).toBe(false)
  })
})

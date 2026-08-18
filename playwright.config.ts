import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:3000'

export default defineConfig({
  // Scoped to tests/e2e so Playwright never picks up the Vitest *.test.ts files.
  // helpers.ts is not collected either: the default testMatch is *.spec.ts.
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // One worker on CI: a GitHub runner has two cores, and every spec shares the
  // one Postgres service and the one `next start`. The specs are independent
  // enough to run in parallel — determinism on the runner is just worth more
  // than the wall-clock saving.
  workers: process.env.CI ? 1 : undefined,
  // `github` annotates failures on the commit itself; `open: 'never'` makes it
  // impossible for the html reporter to try to serve a report on a runner.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI runs the production build, so the suite exercises what actually ships
    // rather than a dev server with its own error overlay and compilation
    // timing. Requires `pnpm build` to have run first — see .github/workflows/ci.yml.
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // `next start` boots fast, but a cold runner still has to load the server
    // bundle; the 60s default has no margin on a busy machine.
    timeout: 120_000,
  },
})

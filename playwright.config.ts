import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:3000'

export default defineConfig({
  // Scoped to tests/e2e so Playwright never picks up the Vitest *.test.ts files.
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})

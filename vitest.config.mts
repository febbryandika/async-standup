import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // Every unit target in SPEC §12 is a pure function, so no DOM is needed.
    environment: 'node',
    // *.test.ts only — tests/e2e holds Playwright's *.spec.ts.
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
})

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = { '@': fileURLToPath(new URL('./', import.meta.url)) }

export default defineConfig({
  test: {
    // `test.workspace` was removed in Vitest 4; inline projects replace it.
    // Each project gets its own Vite server and inherits nothing from the root
    // config, so `resolve` is repeated below rather than hoisted — that is the
    // mechanism, not a copy-paste slip.
    projects: [
      {
        // SPEC §12's pure-function targets. No database, no env, no setup file:
        // `pnpm test` has to pass on a clean clone with nothing running.
        // Deliberately without the `server-only` alias the other project needs,
        // so a DB-backed module dragged in here fails loudly rather than
        // quietly opening a connection.
        test: {
          name: 'unit',
          environment: 'node',
          // One level only — tests/integration needs a database and tests/e2e
          // holds Playwright's *.spec.ts.
          include: ['tests/*.test.ts'],
        },
        resolve: { alias },
      },
      {
        // SPEC §12's listMyStandups target. It is the one assertion about SQL
        // rather than about a function — the "no row on two pages" property
        // lives in the `lt()` predicate — so it needs a real database and stays
        // off the default `pnpm test` path.
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/*.test.ts'],
          setupFiles: ['./tests/integration/setup.ts'],
          // One database, one set of fixture rows: serial files keep two suites
          // from deleting each other's data.
          fileParallelism: false,
        },
        resolve: {
          alias: {
            ...alias,
            // `import 'server-only'` is a marker whose default entry is a bare
            // `throw`; only an RSC bundle resolves its `react-server` condition
            // to the package's own empty file. Outside one — here — that empty
            // file has to be named directly.
            'server-only': fileURLToPath(
              new URL('./node_modules/server-only/empty.js', import.meta.url),
            ),
          },
        },
      },
    ],
  },
})

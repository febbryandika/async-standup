import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Scoped to the integration project by `setupFiles`, so `pnpm test` never runs
// it and the unit project stays env-free. Here it is the difference between
// `pnpm test:integration` working from a clean shell and lib/db throwing
// 'DATABASE_URL is not set' at import time.
//
// It has to be a setup file rather than the config: Vitest evaluates every
// project entry before `--project` filtering, so loading env in the config
// would fire for `pnpm test` too. Setup files run in the worker, after
// filtering, and only for the project that declares them.
//
// process.loadEnvFile leaves an already-set variable alone, which is the
// precedence CI wants — a service container's DATABASE_URL should beat a
// checked-out .env. The existsSync guard is not optional: it throws ENOENT on
// a missing file, and CI has no .env at all.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Integration tests need a database. Run `docker compose up -d` and set DATABASE_URL (.env), then `pnpm test:integration`.',
  )
}

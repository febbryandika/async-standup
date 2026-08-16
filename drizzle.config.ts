import { defineConfig } from 'drizzle-kit'

// `generate` works without credentials; `migrate`/`push`/`studio` need a real
// DATABASE_URL and fail with a connection error when it is missing.
const url = process.env.DATABASE_URL ?? ''

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./lib/db/schema.ts', './lib/db/auth-schema.ts'],
  out: './drizzle',
  dbCredentials: { url },
})

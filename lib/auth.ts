import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db } from './db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  // Server Actions call auth.api.* directly rather than over HTTP, so the
  // Set-Cookie header would never reach the browser without this. It has to
  // stay last: plugins with an `after` hook that run later can set cookies it
  // would then miss.
  plugins: [nextCookies()],
})

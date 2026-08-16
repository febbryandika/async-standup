import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as authSchema from './auth-schema'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

// Better Auth's drizzleAdapter reads the table definitions off this instance,
// so the auth tables have to be part of the schema, not just the project ones.
export const db = drizzle({
  client: pool,
  schema: { ...schema, ...authSchema },
})

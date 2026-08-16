import { createId } from '@paralleldrive/cuid2'
import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export const teams = pgTable('teams', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  timezone: text('timezone').notNull().default('Asia/Tokyo'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const teamMembers = pgTable(
  'team_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['member', 'admin'] })
      .notNull()
      .default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('uq_member_single_team').on(t.userId), // one team per user (implies uniqueness per team)
  ],
)

export const standups = pgTable(
  'standups',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // 'YYYY-MM-DD' in team timezone
    yesterday: text('yesterday').notNull(),
    today: text('today').notNull(),
    blockers: text('blockers'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('uq_standup_user_date').on(t.userId, t.date),
    index('idx_standup_team_date').on(t.teamId, t.date),
  ],
)

export const digestSends = pgTable(
  'digest_sends',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('uq_digest_team_date').on(t.teamId, t.date)],
)

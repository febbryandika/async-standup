import { z } from 'zod'

import { DEFAULT_TIMEZONE, isValidTimezone } from './timezones'

// `z.string().trim().pipe(z.email())` rather than either obvious spelling:
// `z.string().email()` is the deprecated v3 form, and `z.email().trim()`
// validates before it trims, so a padded address would fail.
// These messages are rendered to the user, so they read as instructions rather
// than as Zod's default constraint descriptions.
const emailField = z
  .string()
  .trim()
  .pipe(z.email('Enter a valid email address'))

export const loginSchema = z.object({
  email: emailField,
  // No length rule on sign-in — the password either matches or it doesn't, and
  // a "too short" hint here would only annoy.
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(60, 'Use 60 characters or fewer'),
  email: emailField,
  // Bounds match Better Auth's own minPasswordLength / maxPasswordLength.
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Use 128 characters or fewer'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

export const standupSchema = z.object({
  yesterday: z.string().trim().min(1).max(2000),
  today: z.string().trim().min(1).max(2000),
  blockers: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const joinTeamSchema = z.object({
  // This message is client-side convenience only. `joinTeamAction` collapses
  // every failure — wrong length, no such team — into one string, so the server
  // never reveals which it was.
  inviteCode: z.string().trim().length(6, 'Invite codes are 6 characters'),
})

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a team name')
    .max(60, 'Use 60 characters or fewer'),
  // Refined, not just typed: `todayInTimezone` throws a RangeError on an
  // unknown zone, and nothing downstream could recover from a team stored with
  // one. `.default()` makes this field optional on input and required on
  // output — hence `z.input<...>` for the form, below.
  timezone: z
    .string()
    .refine(isValidTimezone, 'Choose a valid timezone')
    .default(DEFAULT_TIMEZONE),
})

export type JoinTeamInput = z.infer<typeof joinTeamSchema>
export type CreateTeamInput = z.input<typeof createTeamSchema>

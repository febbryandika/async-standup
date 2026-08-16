import { z } from 'zod'

export const standupSchema = z.object({
  yesterday: z.string().trim().min(1).max(2000),
  today: z.string().trim().min(1).max(2000),
  blockers: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const joinTeamSchema = z.object({
  inviteCode: z.string().trim().length(6),
})

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(60),
  timezone: z.string().default('Asia/Tokyo'),
})

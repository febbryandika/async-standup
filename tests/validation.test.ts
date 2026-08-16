import { describe, expect, it } from 'vitest'

import { standupSchema } from '@/lib/validation'

const valid = {
  yesterday: 'Shipped the digest builder',
  today: 'Wire up the cron handler',
}

// SPEC §12 — rejects empty required fields and over-length input.
describe('standupSchema', () => {
  it('accepts a standup without blockers', () => {
    expect(standupSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts an empty blockers string', () => {
    expect(standupSchema.safeParse({ ...valid, blockers: '' }).success).toBe(
      true,
    )
  })

  it.each(['yesterday', 'today'] as const)('rejects an empty %s', (field) => {
    expect(standupSchema.safeParse({ ...valid, [field]: '' }).success).toBe(
      false,
    )
  })

  it.each(['yesterday', 'today'] as const)(
    'rejects a whitespace-only %s',
    (field) => {
      // Proves .trim() runs before .min(1) — '   ' must not pass as content.
      expect(
        standupSchema.safeParse({ ...valid, [field]: '   ' }).success,
      ).toBe(false)
    },
  )

  it.each(['yesterday', 'today', 'blockers'] as const)(
    'rejects a %s over 2000 characters',
    (field) => {
      expect(
        standupSchema.safeParse({ ...valid, [field]: 'a'.repeat(2001) })
          .success,
      ).toBe(false)
    },
  )

  it('accepts exactly 2000 characters', () => {
    expect(
      standupSchema.safeParse({ ...valid, today: 'a'.repeat(2000) }).success,
    ).toBe(true)
  })
})

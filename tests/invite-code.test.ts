import { describe, expect, it } from 'vitest'

import { generateInviteCode } from '@/lib/invite-code'

const SAMPLES = Array.from({ length: 1000 }, () => generateInviteCode())

// SPEC §8 — nanoid(6) from an unambiguous alphabet. The alphabet is the whole
// point of the helper, so it is what gets asserted.
describe('generateInviteCode', () => {
  it('is 6 characters', () => {
    expect(SAMPLES.every((code) => code.length === 6)).toBe(true)
  })

  it.each(['0', 'O', '1', 'I'] as const)(
    'never emits the ambiguous character %s',
    (char) => {
      expect(SAMPLES.some((code) => code.includes(char))).toBe(false)
    },
  )

  it('is uppercase', () => {
    // Load-bearing, not cosmetic: joinTeamAction compares with a plain
    // eq(inviteCode, input.toUpperCase()), which is only case-insensitive
    // because every stored code is uppercase.
    expect(SAMPLES.every((code) => code === code.toUpperCase())).toBe(true)
  })

  it('does not repeat within a thousand codes', () => {
    expect(new Set(SAMPLES).size).toBe(SAMPLES.length)
  })
})

import { customAlphabet } from 'nanoid'

// SPEC §8: an unambiguous alphabet. No 0/O and no 1/I — the code is read off
// one screen and typed into another, so the pairs that look alike are dropped.
// 32 symbols ^ 6 ≈ 1.07e9 codes.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * Uppercase by construction, which is what makes "stored uppercase" true
 * without a trigger — and lets the case-insensitive lookup in `joinTeamAction`
 * be a plain `.toUpperCase()` on the input instead of `ilike`.
 *
 * A collision on `teams_invite_code_unique` is not handled: at ~1.07e9 codes it
 * is not a real failure mode here, and it surfaces as the generic create/
 * regenerate error rather than corrupting anything. A retry loop would be
 * speculative complexity.
 */
export const generateInviteCode = customAlphabet(ALPHABET, 6)

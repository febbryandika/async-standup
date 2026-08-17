import { describe, expect, it } from 'vitest'

import {
  createTeamSchema,
  joinTeamSchema,
  loginSchema,
  registerSchema,
  standupSchema,
} from '@/lib/validation'

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

const validLogin = { email: 'ada@example.com', password: 'correct-horse' }

// SPEC §12 — the auth schemas are re-parsed inside the Server Action, so their
// boundaries are what actually gate a sign-in or sign-up.
describe('loginSchema', () => {
  it('accepts a well-formed email and password', () => {
    expect(loginSchema.safeParse(validLogin).success).toBe(true)
  })

  it('trims surrounding whitespace off the email', () => {
    // Guards the z.string().trim().pipe(z.email()) ordering: z.email().trim()
    // would validate before trimming and reject this.
    const result = loginSchema.safeParse({
      ...validLogin,
      email: '  ada@example.com  ',
    })
    expect(result.success && result.data.email).toBe('ada@example.com')
  })

  it.each(['ada', 'ada@', '@example.com', ''] as const)(
    'rejects the malformed email %o',
    (email) => {
      expect(loginSchema.safeParse({ ...validLogin, email }).success).toBe(
        false,
      )
    },
  )

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ ...validLogin, password: '' }).success).toBe(
      false,
    )
  })

  it('accepts a short password', () => {
    // Deliberate: length is Better Auth's business at sign-up, and a minimum
    // here would only tell an attacker their guess was too short to be real.
    expect(
      loginSchema.safeParse({ ...validLogin, password: 'a' }).success,
    ).toBe(true)
  })
})

const validRegister = { name: 'Ada Lovelace', ...validLogin }

describe('registerSchema', () => {
  it('accepts a complete registration', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true)
  })

  it.each(['', '   '] as const)('rejects the empty name %o', (name) => {
    expect(registerSchema.safeParse({ ...validRegister, name }).success).toBe(
      false,
    )
  })

  it('trims surrounding whitespace off the name', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      name: '  Ada Lovelace  ',
    })
    expect(result.success && result.data.name).toBe('Ada Lovelace')
  })

  it('rejects a name over 60 characters', () => {
    expect(
      registerSchema.safeParse({ ...validRegister, name: 'a'.repeat(61) })
        .success,
    ).toBe(false)
  })

  it('rejects a password under 8 characters', () => {
    expect(
      registerSchema.safeParse({ ...validRegister, password: 'short7!' })
        .success,
    ).toBe(false)
  })

  it('accepts exactly 8 characters', () => {
    // Matches Better Auth's minPasswordLength default, which the seeded demo
    // password (demo1234) sits exactly on.
    expect(
      registerSchema.safeParse({ ...validRegister, password: 'demo1234' })
        .success,
    ).toBe(true)
  })

  it('rejects a password over 128 characters', () => {
    expect(
      registerSchema.safeParse({
        ...validRegister,
        password: 'a'.repeat(129),
      }).success,
    ).toBe(false)
  })
})

// SPEC §5.1 — the team schemas gate onboarding, the one surface where a user
// has no team yet and every downstream invariant is still unset.
describe('createTeamSchema', () => {
  it('accepts a name and an explicit timezone', () => {
    expect(
      createTeamSchema.safeParse({ name: 'Kaizen Works', timezone: 'UTC' })
        .success,
    ).toBe(true)
  })

  it('defaults an omitted timezone to Asia/Tokyo', () => {
    const result = createTeamSchema.safeParse({ name: 'Kaizen Works' })
    expect(result.success && result.data.timezone).toBe('Asia/Tokyo')
  })

  it.each(['', '   '] as const)('rejects the empty name %o', (name) => {
    expect(createTeamSchema.safeParse({ name }).success).toBe(false)
  })

  it('trims surrounding whitespace off the name', () => {
    const result = createTeamSchema.safeParse({ name: '  Kaizen Works  ' })
    expect(result.success && result.data.name).toBe('Kaizen Works')
  })

  it('rejects a name over 60 characters', () => {
    expect(createTeamSchema.safeParse({ name: 'a'.repeat(61) }).success).toBe(
      false,
    )
  })

  it.each(['Not/AZone', 'Asia/Tokio', 'GMT+9', ''] as const)(
    'rejects the unknown timezone %o',
    (timezone) => {
      // The regression guard that matters: todayInTimezone() throws a
      // RangeError on an unknown zone, and a team has no edit surface, so a
      // bad value here would break every one of its pages for good.
      expect(
        createTeamSchema.safeParse({ name: 'Kaizen Works', timezone }).success,
      ).toBe(false)
    },
  )
})

describe('joinTeamSchema', () => {
  it('accepts exactly 6 characters', () => {
    expect(joinTeamSchema.safeParse({ inviteCode: 'K7M2QX' }).success).toBe(
      true,
    )
  })

  it.each(['K7M2Q', 'K7M2QXA', ''] as const)(
    'rejects the %o-length code',
    (inviteCode) => {
      expect(joinTeamSchema.safeParse({ inviteCode }).success).toBe(false)
    },
  )

  it('trims before measuring length', () => {
    // A pasted code usually arrives with whitespace attached; trimming after
    // the length check would reject it.
    const result = joinTeamSchema.safeParse({ inviteCode: '  K7M2QX  ' })
    expect(result.success && result.data.inviteCode).toBe('K7M2QX')
  })

  it('accepts a lowercase code', () => {
    // Case folding is joinTeamAction's job, not the schema's — the schema must
    // not reject what the action is about to normalise.
    expect(joinTeamSchema.safeParse({ inviteCode: 'k7m2qx' }).success).toBe(
      true,
    )
  })
})

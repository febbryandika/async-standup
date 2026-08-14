import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

// Proves the toolchain end to end: Vitest runs, TypeScript compiles, and the
// '@/' path alias resolves the same way it does inside Next.
describe('toolchain', () => {
  it('resolves the @/ alias', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('merges conflicting Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})

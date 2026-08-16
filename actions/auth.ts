'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@/lib/validation'

export type AuthState = {
  error?: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'password', string>>
}

// One message for every failure. Better Auth already collapses all four
// sign-in failure modes into a single response; sign-up would otherwise return
// a distinguishable 422 for a duplicate email, so we flatten it here too.
const SIGN_IN_FAILED = 'Email or password is incorrect'
const SIGN_UP_FAILED = "We couldn't create that account. Please try again."

function fieldErrorsOf(
  issues: { path: PropertyKey[]; message: string }[],
): AuthState['fieldErrors'] {
  const fieldErrors: AuthState['fieldErrors'] = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (key === 'name' || key === 'email' || key === 'password') {
      fieldErrors[key] ??= issue.message
    }
  }
  return fieldErrors
}

export async function signInAction(
  _prevState: AuthState,
  values: LoginInput,
): Promise<AuthState> {
  // Re-parsed server-side: the client resolver is a convenience, not a gate.
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error.issues) }
  }

  try {
    await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(), // records ip_address / user_agent on the session
    })
  } catch {
    return { error: SIGN_IN_FAILED }
  }

  redirect('/') // outside the try — redirect() works by throwing
}

export async function signUpAction(
  _prevState: AuthState,
  values: RegisterInput,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse(values)
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error.issues) }
  }

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() })
  } catch {
    return { error: SIGN_UP_FAILED }
  }

  redirect('/onboarding')
}

export async function signOutAction(): Promise<void> {
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {
    // Session already gone or revoked server-side. Either way the user is
    // signed out and the destination is the same, so don't surface an error.
  }

  redirect('/login')
}

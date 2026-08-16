import type { Metadata } from 'next'

import { signOutAction } from '@/actions/auth'
import { requireUser } from '@/lib/session'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Onboarding' }

export default async function OnboardingPage() {
  // requireUser, not requireMember: this page is where requireMember sends a
  // user who has no team, so guarding it with requireMember would loop.
  const user = await requireUser()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Onboarding</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user.email}. Creating and joining teams arrives in the
        next phase.
      </p>
      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  )
}

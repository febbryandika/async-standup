import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { signOutAction } from '@/actions/auth'
import { getMembership, requireUser } from '@/lib/session'
import { CreateTeamForm } from '@/components/create-team-form'
import { JoinTeamForm } from '@/components/join-team-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Set up your team' }

export default async function OnboardingPage() {
  // requireUser, not requireMember: this page is where requireMember sends a
  // user who has no team, so guarding it with requireMember would loop.
  const user = await requireUser()

  // …and getMembership rather than a second query: a user who already has a
  // team has nothing to do here.
  if (await getMembership()) redirect('/')

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Set up your team</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user.email}. Start a team, or join one you were invited to
        — you belong to exactly one.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 md:items-start">
        <Card>
          <CardHeader>
            {/* CardTitle renders a div, so the real heading goes inside it —
                the page still needs an h1 → h2 outline. */}
            <CardTitle>
              <h2>Create a team</h2>
            </CardTitle>
            <CardDescription>
              You&rsquo;ll be the admin, and you&rsquo;ll get an invite code to
              share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTeamForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Join a team</h2>
            </CardTitle>
            <CardDescription>
              Already have an invite code? Enter it here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinTeamForm />
          </CardContent>
        </Card>
      </div>

      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </main>
  )
}

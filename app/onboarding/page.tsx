import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { signOutAction } from '@/actions/auth'
import { CreateTeamForm } from '@/components/create-team-form'
import { JoinTeamForm } from '@/components/join-team-form'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { getMembership, requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Set up your team' }

export default async function OnboardingPage() {
  // requireUser, not requireMember: this page is where requireMember sends a
  // user who has no team, so guarding it with requireMember would loop.
  const user = await requireUser()

  // …and getMembership rather than a second query: a user who already has a
  // team has nothing to do here.
  if (await getMembership()) redirect('/')

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 md:py-12">
        <div className="flex flex-col gap-2.5">
          <span className="bg-muted text-muted-foreground self-start rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-wider uppercase">
            Step 2 of 2
          </span>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight md:text-3xl">
            Set up your team
          </h1>
          <p className="text-muted-foreground max-w-[60ch] text-sm text-pretty">
            Signed in as {user.email}. Start a team and you&rsquo;re its admin,
            or join one you were invited to — you belong to exactly one.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 md:items-start">
          <section
            aria-labelledby="create-team-heading"
            className="bg-card shadow-card flex flex-col gap-4 rounded-2xl border p-5"
          >
            <div className="flex flex-col gap-1">
              <h2 id="create-team-heading" className="text-base font-semibold">
                Create a team
              </h2>
              <p className="text-muted-foreground text-sm">
                You&rsquo;ll be the admin, and you&rsquo;ll get an invite code
                to share.
              </p>
            </div>
            <CreateTeamForm />
          </section>

          <section
            aria-labelledby="join-team-heading"
            className="bg-card shadow-card flex flex-col gap-4 rounded-2xl border p-5"
          >
            <div className="flex flex-col gap-1">
              <h2 id="join-team-heading" className="text-base font-semibold">
                Join a team
              </h2>
              <p className="text-muted-foreground text-sm">
                Already have an invite code? Enter it here.
              </p>
            </div>
            <JoinTeamForm />
          </section>
        </div>

        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </main>
    </div>
  )
}

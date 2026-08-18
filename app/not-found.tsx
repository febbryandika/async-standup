import type { Metadata } from 'next'
import Link from 'next/link'

import { ErrorState } from '@/components/error-state'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Not found' }

/**
 * SPEC §6.1's 404. Root-level, so it renders inside `app/layout.tsx` without
 * the app shell — which is why it carries its own header and its own way back.
 *
 * This is not only for mistyped URLs. `requireAdmin()` (lib/session.ts) answers
 * a non-admin at `/team/settings` with `notFound()` rather than a redirect, and
 * with no nearer `not-found.tsx` that request lands here. The copy is vague on
 * purpose: it never distinguishes "no such page" from "not yours", for the same
 * reason onboarding's invite-code error refuses to say why a code failed.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 md:py-12">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight md:text-3xl">
          Not found
        </h1>

        <ErrorState
          title="We couldn't find that page"
          description="The page doesn't exist, or the link is out of date."
        >
          <Button asChild variant="outline">
            <Link href="/">Back to today</Link>
          </Button>
        </ErrorState>
      </main>
    </div>
  )
}

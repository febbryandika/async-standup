import type { Metadata } from 'next'
import Link from 'next/link'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Not found' }

/**
 * SPEC §6.1's 404. Root-level, so it renders inside `app/layout.tsx` with the
 * header but without the app nav — which is why it carries its own way back.
 *
 * This is not only for mistyped URLs. `requireAdmin()` (lib/session.ts) answers
 * a non-admin at `/team/settings` with `notFound()` rather than a redirect, and
 * with no nearer `not-found.tsx` that request lands here. The copy is vague on
 * purpose: it never distinguishes "no such page" from "not yours", for the same
 * reason onboarding's invite-code error refuses to say why a code failed.
 */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Not found</h1>

      <div className="mt-6">
        <ErrorState
          title="We couldn't find that page"
          description="The page doesn't exist, or the link is out of date."
        >
          <Button asChild variant="outline">
            <Link href="/">Back to today</Link>
          </Button>
        </ErrorState>
      </div>
    </main>
  )
}

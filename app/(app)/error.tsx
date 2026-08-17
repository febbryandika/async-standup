'use client'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'

type AppErrorProps = {
  error: Error & { digest?: string }
  /**
   * Next 16's replacement for `reset` — it re-fetches and re-renders the
   * boundary's children rather than only clearing the error state, which is what
   * a failed query actually needs. Stable since 16.3.0.
   */
  retry: () => void
}

/**
 * SPEC §6.1: the boundary behind the team feed and history, with the Retry the
 * table asks for. This renders inside `(app)/layout.tsx`, so it inherits the nav
 * — but a layout is not a page, and the `<main>` and `<h1>` the route would have
 * supplied are gone with it. They are supplied here.
 *
 * `error` is not rendered. An error thrown in a Server Component reaches the
 * client as a generic message plus a digest by design, so printing it would show
 * the reader nothing they can act on; the digest is already in the server log
 * next to the real stack.
 *
 * Note the boundary's reach: it catches this segment's pages and their children,
 * not `(app)/layout.tsx` itself. A `requireMember()` failure in the layout —
 * the database being down at exactly the wrong moment — bubbles past this to
 * Next's default. Closing that needs an `app/error.tsx`, which SPEC §6.1 does
 * not list.
 */
export default function AppError({ retry }: AppErrorProps) {
  // Wrapped rather than passed straight to onClick: `retry` takes no arguments,
  // and handing it the click event is a free way to be surprised later.
  function handleRetry() {
    retry()
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Something went wrong</h1>

      <div className="mt-6">
        <ErrorState
          title="We couldn't load this page"
          description="The problem is usually temporary. Trying again will re-run the query."
        >
          <Button type="button" onClick={handleRetry}>
            Retry
          </Button>
        </ErrorState>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

import { formatDateLong, parseCursorParam } from '@/lib/date'
import { listMyStandups } from '@/lib/queries'
import { requireMember } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { StandupCard } from '@/components/standup-card'

export const metadata: Metadata = { title: 'History' }

export default async function HistoryPage({
  searchParams,
}: PageProps<'/history'>) {
  const { user } = await requireMember()

  // A stale or hand-edited ?before= means "the newest page", not a 404.
  const before = parseCursorParam((await searchParams).before)
  const { items, nextCursor } = await listMyStandups(user.id, before)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">History</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your updates, newest first.
      </p>

      {/* The cards carry <h3>s, so the list needs an <h2> above them or the
          heading order skips a level. Visually the <h1> already says it. */}
      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="sr-only">
          Past updates
        </h2>

        {items.length === 0 ? (
          // Two empty states, not one: reaching the end of the cursor is a
          // different thing from never having posted, and only the second one
          // should send someone to the form.
          <div className="mt-6">
            {before ? (
              <EmptyState title="No older updates">
                <Link href="/history" className="underline">
                  Back to the newest
                </Link>
              </EmptyState>
            ) : (
              <EmptyState title="No standups yet">
                <Link href="/" className="underline">
                  Post your first one
                </Link>
              </EmptyState>
            )}
          </div>
        ) : (
          <ul className="mt-6 grid gap-4">
            {items.map((standup) => (
              <li key={standup.id}>
                <StandupCard
                  heading={
                    <time dateTime={standup.date}>
                      {formatDateLong(standup.date)}
                    </time>
                  }
                  standup={standup}
                />
              </li>
            ))}
          </ul>
        )}

        {nextCursor ? (
          // SPEC §3.5: a plain link, so each page is its own server render and
          // "Load older" still works with JavaScript disabled.
          <Button asChild variant="outline" className="mt-6">
            <Link href={`/history?before=${nextCursor}`}>Load older</Link>
          </Button>
        ) : null}
      </section>
    </main>
  )
}

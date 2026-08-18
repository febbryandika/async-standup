import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StandupCard } from '@/components/standup-card'
import { Button } from '@/components/ui/button'
import { formatDateLong, parseCursorParam } from '@/lib/date'
import { listMyStandups } from '@/lib/queries'
import { requireMember } from '@/lib/session'

export const metadata: Metadata = { title: 'History' }

export default async function HistoryPage({
  searchParams,
}: PageProps<'/history'>) {
  const { user } = await requireMember()

  // A stale or hand-edited ?before= means "the newest page", not a 404.
  const before = parseCursorParam((await searchParams).before)
  const { items, nextCursor } = await listMyStandups(user.id, before)

  return (
    <>
      <PageHeader
        title="History"
        description="Every update you have posted, newest first — gaps included, because they are the interesting part."
      />

      {/* The cards carry <h3>s, so the list needs an <h2> above them or the
          heading order skips a level. Visually the <h1> already says it. */}
      <section aria-labelledby="history-heading" className="mt-6">
        <h2 id="history-heading" className="sr-only">
          Past updates
        </h2>

        {items.length === 0 ? (
          // Two empty states, not one: reaching the end of the cursor is a
          // different thing from never having posted, and only the second one
          // should send someone to the form.
          before ? (
            <EmptyState title="No older updates">
              <Link
                href="/history"
                className="text-primary underline-offset-4 hover:underline"
              >
                Back to the newest
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title="No standups yet">
              <Link
                href="/"
                className="text-primary underline-offset-4 hover:underline"
              >
                Post your first one
              </Link>
            </EmptyState>
          )
        ) : (
          <ul className="grid max-w-3xl gap-3.5">
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
          <Button asChild variant="outline" size="lg" className="mt-5">
            <Link href={`/history?before=${nextCursor}`}>Load older</Link>
          </Button>
        ) : null}
      </section>
    </>
  )
}

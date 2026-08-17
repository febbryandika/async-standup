import { Skeleton } from '@/components/ui/skeleton'
import { StandupSkeleton } from '@/components/standup-skeleton'

/**
 * SPEC §6.1's loading tier. One file covers `/`, `/history`, `/team` and both
 * `/team/*` pages — a segment without its own `loading.tsx` inherits the nearest
 * ancestor boundary, and history's "skeleton rows" are these same cards.
 *
 * §6.1 wants the skeleton count to match the team, "because the real count is
 * known server-side". It isn't known *here*: a Suspense fallback is rendered
 * before anything it stands in for has resolved, and the member count comes out
 * of the very `listTeamFeed` call being awaited. Reaching the real number would
 * mean a second query and splitting the feed into a streaming child — a change
 * to how the page fetches, made for the benefit of its placeholder. What
 * actually stops the layout shifting is the *card* matching, which
 * `StandupSkeleton` does exactly; the count is a fixed guess at a team.
 *
 * Six because that is the team `scripts/seed.ts` creates, which is the one every
 * reviewer and every screenshot actually loads — so the demo shifts by nothing.
 * Worth saying out loud that the constant is tuned to the seed rather than
 * dressing it up as a universal default: for a team of another size it is wrong,
 * and wrong only by rows of the right height.
 */
const PLACEHOLDER_CARDS = 6

/**
 * Shape-neutral on purpose. `/` also has the standup form above its feed, but a
 * form-shaped block here would be wrong on `/team` and `/history` — and a
 * placeholder that lies about two routes to flatter one is a worse trade than a
 * short shell that is honest about all three.
 */
export default function Loading() {
  // Worth knowing where this does and doesn't show: a loading.tsx wraps its
  // segment's children, not the layout beside it, and `(app)/layout.tsx` awaits
  // requireMember() — which reads headers(). So a cold hard load blocks on the
  // guard before this can stream, and it is the soft navigations between
  // `/`, `/history` and `/team` where it actually appears. Moving the guard out
  // of the layout would change that, and would be a restructure.
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* The heading and date line each stand in for one line box: text-lg is
          1.75rem, text-sm is 1.25rem. */}
      <Skeleton aria-hidden className="h-7 w-24" />
      <Skeleton aria-hidden className="mt-2 h-5 w-64" />

      <div className="mt-10">
        <Skeleton aria-hidden className="h-7 w-32" />

        {/* aria-hidden on the list, not on each card: hiding only the cards
            would leave four empty <li>s for a screen reader to count. Index
            keys are right here — a fixed-length run of identical, stateless
            nodes that never reorders. */}
        <ul aria-hidden className="mt-4 grid gap-4">
          {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
            <li key={index}>
              <StandupSkeleton />
            </li>
          ))}
        </ul>
      </div>

      {/* The skeletons are aria-hidden, so this is the only thing a screen
          reader gets. role="status" rather than a bare aria-live region: it is
          announced politely and needs no wrapper that exists before it speaks,
          because the whole subtree is mounted and unmounted at once. */}
      <p role="status" className="sr-only">
        Loading updates
      </p>
    </main>
  )
}

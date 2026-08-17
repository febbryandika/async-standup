import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * One field's worth of placeholder, box-for-box with `StandupCard`'s `Field`:
 * a `text-xs` label line, `mt-1`, then a `text-sm` value line. The bar heights
 * are the line boxes those two type sizes produce (1rem and 1.25rem), not
 * guesses — matching them is what stops the cards below shifting when the real
 * content lands.
 */
function SkeletonField() {
  return (
    <div>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-1 h-5 w-full" />
    </div>
  )
}

/**
 * SPEC §6.1's loading state for the feed. Built from the same Card primitives
 * `StandupCard` uses rather than from copied class strings: padding, radius,
 * ring and `--card-spacing` then track the card by construction, and a restyle
 * of Card can't quietly desync the skeleton from the thing it stands in for.
 *
 * Two fields, not three. Blockers are optional and the seed only puts them on a
 * quarter of the rows, so two is the card people actually see — a three-field
 * skeleton would overshoot most of the list rather than under-shoot a few of it.
 *
 * Measured against the real thing on the seeded feed: a posted two-field card
 * is 162px and this renders at 162px. The cards it cannot match are the ones no
 * skeleton could — "No update yet" is 90px, and a card with blockers is 218px.
 * Which of those a given member will turn out to have is exactly the thing the
 * query has not answered yet.
 */
export function StandupSkeleton() {
  return (
    // No aria-hidden here — it belongs on the list that holds these, so the
    // <li>s go with them rather than being announced as empty rows. The
    // "loading" announcement is the page's job, not one placeholder's.
    <Card>
      <CardHeader>
        {/* text-base/leading-snug is a 1.375rem line box — h-5.5 on the 0.25rem
            spacing scale. */}
        <CardTitle>
          <Skeleton className="h-5.5 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <SkeletonField />
          <SkeletonField />
        </div>
      </CardContent>
    </Card>
  )
}

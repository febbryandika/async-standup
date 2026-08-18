import { Skeleton } from '@/components/ui/skeleton'

/**
 * One field's worth of placeholder, box-for-box with `StandupCard`'s `Field`:
 * a 1.5rem row on `sm` and up, where the label and the value share a line, and
 * two stacked rows below it — the same reflow the real field does.
 */
function SkeletonField() {
  return (
    <div className="grid gap-1 sm:grid-cols-[5.5rem_1fr] sm:gap-2.5">
      <div className="flex h-6 items-center">
        <Skeleton className="h-3.5 w-14" />
      </div>
      <div className="flex h-6 items-center">
        <Skeleton className="h-3.5 w-full" />
      </div>
    </div>
  )
}

/**
 * SPEC §6.1's loading state for the feed.
 *
 * The outer box is `StandupCard`'s, class for class — border, radius, padding
 * and gap. That duplication is deliberate and load-bearing: the two must be
 * edited together, and the comment in `StandupCard` says so from the other
 * side. Building this from the shadcn `Card` primitive instead would track a
 * component neither one uses any more.
 *
 * Two fields, not three. Blockers are optional and the seed only puts them on a
 * quarter of the rows, so two is the card people actually see — a three-field
 * skeleton would overshoot most of the list rather than under-shoot a few of it.
 */
export function StandupSkeleton() {
  return (
    // No aria-hidden here — it belongs on the list that holds these, so the
    // <li>s go with them rather than being announced as empty rows. The
    // "loading" announcement is the page's job, not one placeholder's.
    <div className="bg-card shadow-card flex flex-col gap-3.5 rounded-2xl border px-5 py-4.5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ms-auto h-5 w-16 rounded-4xl" />
      </div>
      <div className="grid gap-3">
        <SkeletonField />
        <SkeletonField />
      </div>
    </div>
  )
}

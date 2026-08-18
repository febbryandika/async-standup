import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title: string
  /** Body copy. `/history` puts a link in here; the feed passes nothing. */
  children?: ReactNode
}

/**
 * SPEC §6.1's "illustration card" — the empty state for a list, so an empty
 * feed still looks like a rendered page instead of a failed one.
 *
 * A dashed outline rather than a solid card: it has to sit in the same column
 * as real cards without competing with them, and dashed is the conventional
 * "this is a placeholder, not content".
 *
 * One icon for every caller. Every empty state in this app means the same thing
 * ("nothing has been written here yet"), and an `icon` prop would be a knob with
 * one sensible setting.
 *
 * The title is a `<p>`, not a heading: it is a transient message, and promoting
 * it would put a line in the document outline that disappears the moment someone
 * posts. The section it sits in already carries the real heading.
 */
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed px-5 py-9 text-center">
      <span
        aria-hidden
        className="bg-tint-blue text-tint-blue-foreground grid size-12 place-items-center rounded-2xl"
      >
        <Inbox className="size-5.5" strokeWidth={1.5} />
      </span>
      <p className="font-semibold">{title}</p>
      {children ? (
        <p className="text-muted-foreground max-w-[44ch] text-sm text-balance">
          {children}
        </p>
      ) : null}
    </div>
  )
}

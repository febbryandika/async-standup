import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type EmptyStateProps = {
  title: string
  /** Body copy. `/history` puts a link in here; the feed passes nothing. */
  children?: ReactNode
}

/**
 * SPEC §6.1's "illustration card" — the empty state for a list, as a card rather
 * than a stray line of grey text, so an empty feed still looks like a rendered
 * page instead of a failed one.
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
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
        <Inbox
          aria-hidden
          className="size-6 text-muted-foreground"
          strokeWidth={1.5}
        />
        <p className="font-medium">{title}</p>
        {children ? (
          <p className="text-sm text-balance text-muted-foreground">
            {children}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type ErrorStateProps = {
  title: string
  description: string
  /** The way out: a Retry button on `error.tsx`, a link home on `not-found`. */
  children?: ReactNode
}

/**
 * SPEC §6.1's error surface, shared by `app/(app)/error.tsx` and
 * `app/not-found.tsx` so a broken page and a missing one read as one system.
 *
 * Deliberately the same centred card as `EmptyState` rather than an `Alert`.
 * `Alert` is a compact inline strip whose grid reflows around a leading icon —
 * good for the form-level write failure it already carries in `StandupForm`, and
 * the wrong shape for a whole page that has nothing else on it. The icon and the
 * copy carry the meaning; the destructive tint is reinforcement, not the signal.
 */
export function ErrorState({ title, description, children }: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
        <TriangleAlert
          aria-hidden
          className="size-6 text-destructive"
          strokeWidth={1.5}
        />
        <p className="font-medium">{title}</p>
        <p className="text-sm text-balance text-muted-foreground">
          {description}
        </p>
        {children ? <div className="mt-2">{children}</div> : null}
      </CardContent>
    </Card>
  )
}

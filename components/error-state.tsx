import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

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
 * Deliberately the same centred shape as `EmptyState`, but on a solid card
 * rather than a dashed outline: an empty list is a normal state, a failed one is
 * not. It is not an `Alert` — that is a compact inline strip whose grid reflows
 * around a leading icon, good for the form-level write failure `StandupForm`
 * already carries and the wrong shape for a whole page with nothing else on it.
 * The icon and the copy carry the meaning; the destructive tint is
 * reinforcement, not the signal.
 */
export function ErrorState({ title, description, children }: ErrorStateProps) {
  return (
    <div className="bg-card shadow-card flex flex-col items-center gap-2.5 rounded-2xl border px-5 py-11 text-center">
      <span
        aria-hidden
        className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-2xl"
      >
        <TriangleAlert className="size-5.5" strokeWidth={1.6} />
      </span>
      <p className="text-[1.05rem] font-semibold">{title}</p>
      <p className="text-muted-foreground max-w-[44ch] text-sm text-balance">
        {description}
      </p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}

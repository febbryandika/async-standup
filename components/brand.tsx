import { cn } from '@/lib/utils'

/**
 * The wordmark, with an optional second line for the team. The tile is the
 * only place in the app that paints a solid primary block at small size, which
 * is what makes it read as a mark rather than a button.
 */
export function Brand({
  subtitle,
  className,
}: {
  subtitle?: string
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="bg-primary text-primary-foreground grid size-8.5 shrink-0 place-items-center rounded-xl text-[0.8rem] font-bold tracking-tight"
      >
        as
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm leading-tight font-semibold">
          Async Standup
        </span>
        {subtitle ? (
          <span className="text-muted-foreground truncate text-xs leading-tight">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  )
}

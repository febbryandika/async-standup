import { cn } from '@/lib/utils'

/**
 * The four pastel chips from the design system. Written out rather than
 * composed, because Tailwind only sees class names it can find as whole
 * strings in the source.
 */
const TINTS = [
  'bg-tint-blue text-tint-blue-foreground',
  'bg-tint-mint text-tint-mint-foreground',
  'bg-tint-peach text-tint-peach-foreground',
  'bg-tint-lavender text-tint-lavender-foreground',
] as const

/**
 * A name always gets the same colour, on every surface and between renders —
 * so a face becomes recognisable in the feed, the matrix and the member table
 * without anyone storing an avatar. Any stable hash does; this is the smallest
 * one worth reading.
 */
function tintFor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 997
  return TINTS[hash % TINTS.length]!
}

/** Up to two initials — "Mika Sato" → MS, "Prince" → P. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = [words.at(0), words.length > 1 ? words.at(-1) : undefined]
  return letters
    .filter((word) => word !== undefined)
    .map((word) => [...word][0]!.toUpperCase())
    .join('')
}

/**
 * aria-hidden throughout: every caller renders the person's name next to this,
 * so announcing "MS" as well would only add noise.
 */
export function AvatarInitials({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold',
        tintFor(name),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

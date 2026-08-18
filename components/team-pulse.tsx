import type { FeedEntry } from '@/components/team-feed'

/**
 * The two numbers the page exists to answer — how many people have posted, and
 * how many are blocked — read straight off the feed the page already loaded.
 * No extra query, and nothing here that the cards below do not also say in
 * full; this is the version you can take in without reading.
 */
export function TeamPulse({ entries }: { entries: FeedEntry[] }) {
  const total = entries.length
  const posted = entries.filter((entry) => entry.standup).length
  const blocked = entries.filter((entry) => entry.standup?.blockers).length
  const missing = entries.filter((entry) => !entry.standup)

  // A conic gradient rather than an SVG arc: one element, no viewBox maths, and
  // it inherits the theme through the same two tokens everything else uses.
  const sweep = total === 0 ? 0 : Math.round((posted / total) * 360)

  return (
    <section
      aria-labelledby="pulse-heading"
      className="bg-card shadow-card mt-6 flex flex-wrap items-center gap-x-7 gap-y-4 rounded-2xl border px-5 py-4"
    >
      {/* Neither "Today" nor "Team": getByRole matches an accessible name by
          substring, and both words already name something else on this page —
          the <h1> and the feed region. */}
      <h2 id="pulse-heading" className="sr-only">
        At a glance
      </h2>

      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--primary) ${sweep}deg, var(--muted) 0)`,
          }}
        >
          <span className="bg-card grid size-11 place-items-center rounded-full text-sm font-bold">
            {posted}/{total}
          </span>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">
            {posted} of {total} posted
          </span>
          <span className="text-muted-foreground text-xs">
            {missing.length === 0
              ? 'Everyone has posted'
              : `Still waiting on ${missing.map((entry) => entry.name).join(', ')}`}
          </span>
        </span>
      </div>

      <span aria-hidden className="bg-border hidden h-11 w-px sm:block" />

      <span className="flex flex-col gap-0.5">
        {/* The word carries the meaning; the colour only reinforces it. */}
        <span
          className={
            blocked > 0
              ? 'text-destructive text-sm font-semibold'
              : 'text-sm font-semibold'
          }
        >
          {blocked} blocked
        </span>
        <span className="text-muted-foreground text-xs">
          {blocked === 0
            ? 'Nothing is holding the team up'
            : "Lifted to the top of tomorrow's digest"}
        </span>
      </span>
    </section>
  )
}

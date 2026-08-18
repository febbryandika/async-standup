import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

import { AvatarInitials } from '@/components/avatar-initials'
import { Badge } from '@/components/ui/badge'

export type StandupCardEntry = {
  yesterday: string
  today: string
  blockers: string | null
}

type StandupCardProps = {
  /**
   * Whatever identifies this card, rendered inside its <h3>. The team feed
   * passes a member's name; /history passes a <time>, because there every card
   * is the same person and the date is what tells them apart.
   */
  heading: ReactNode
  /**
   * The person, when the card is one of many people. Only /history omits it —
   * an avatar of yourself, repeated down a column of your own updates, is
   * decoration with nothing to distinguish.
   */
  name?: string
  standup: StandupCardEntry | null
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[5.5rem_1fr] sm:gap-2.5">
      <dt className="text-muted-foreground text-[0.7rem] leading-6 font-semibold tracking-wider uppercase">
        {label}
      </dt>
      {/* whitespace-pre-wrap: the fields are plain text and people type lists
          into them. Collapsing the newlines would lose the author's structure. */}
      <dd className="text-[0.9rem] leading-relaxed whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  )
}

/**
 * The blockers field gets its own box rather than a third label row — lifted
 * out of the label column, because this is the line the whole page is read to
 * find. Still a <dt>/<dd> pair, so the definition-list semantics hold.
 */
function BlockersField({ value }: { value: string }) {
  return (
    // One <div> deep, and no deeper: a <dl> may wrap a dt/dd pair in a div, but
    // only one — nesting the pair inside a second div is what axe's
    // definition-list and dlitem rules fail on.
    <div className="border-destructive/25 bg-destructive/6 rounded-xl border p-3">
      <dt className="text-destructive flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wider uppercase">
        <TriangleAlert aria-hidden className="size-3.5" strokeWidth={1.9} />
        Blockers
      </dt>
      <dd className="mt-1 text-[0.9rem] leading-relaxed whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  )
}

/**
 * SPEC §6.2: the tinted border is reinforcement. The badge's text is the
 * signal, so the card still reads correctly with colour removed.
 *
 * The box — border, radius, padding, shadow — is duplicated by
 * `StandupSkeleton`; the two have to move together or the feed jumps when the
 * query lands.
 */
export function StandupCard({ heading, name, standup }: StandupCardProps) {
  const hasBlockers = Boolean(standup?.blockers)

  return (
    <article
      className={`bg-card shadow-card flex flex-col gap-3.5 rounded-2xl border px-5 py-4.5 ${
        hasBlockers ? 'border-destructive/40' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {name ? <AvatarInitials name={name} /> : null}
        <h3 className="min-w-0 flex-1 text-[0.95rem] leading-tight font-semibold">
          {heading}
        </h3>
        {standup ? (
          hasBlockers ? (
            <Badge variant="destructive">Blocker</Badge>
          ) : (
            <Badge className="bg-tint-mint text-tint-mint-foreground">
              Posted
            </Badge>
          )
        ) : (
          <Badge className="bg-muted text-muted-foreground">No update</Badge>
        )}
      </div>

      {standup ? (
        <dl className="grid gap-3">
          <Field label="Yesterday" value={standup.yesterday} />
          <Field label="Today" value={standup.today} />
          {standup.blockers ? <BlockersField value={standup.blockers} /> : null}
        </dl>
      ) : (
        <p className="bg-muted text-muted-foreground rounded-xl px-3.5 py-3 text-sm">
          No update yet
        </p>
      )}
    </article>
  )
}

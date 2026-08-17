import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
  standup: StandupCardEntry | null
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      {/* whitespace-pre-wrap: the fields are plain text and people type lists
          into them. Collapsing the newlines would lose the author's structure. */}
      <dd className="mt-1 text-sm whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

export function StandupCard({ heading, standup }: StandupCardProps) {
  const hasBlockers = Boolean(standup?.blockers)

  return (
    // SPEC §6.2: the outline is reinforcement. The badge's text is the signal,
    // so the card still reads correctly with colour removed. Card draws its
    // edge with a ring, not a border, so tinting the ring is what shows.
    <Card className={hasBlockers ? 'ring-destructive/40' : undefined}>
      <CardHeader>
        {/* CardTitle renders a div, so the real heading goes inside it. */}
        <CardTitle>
          <h3>{heading}</h3>
        </CardTitle>
        {hasBlockers ? (
          <CardAction>
            <Badge variant="destructive">Blocker</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {standup ? (
          <dl className="grid gap-3">
            <Field label="Yesterday" value={standup.yesterday} />
            <Field label="Today" value={standup.today} />
            {standup.blockers ? (
              <Field label="Blockers" value={standup.blockers} />
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No update yet</p>
        )}
      </CardContent>
    </Card>
  )
}

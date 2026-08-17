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
  name: string
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

export function StandupCard({ name, standup }: StandupCardProps) {
  const hasBlockers = Boolean(standup?.blockers)

  return (
    // SPEC §6.2: the outline is reinforcement. The badge's text is the signal,
    // so the card still reads correctly with colour removed. Card draws its
    // edge with a ring, not a border, so tinting the ring is what shows.
    <Card className={hasBlockers ? 'ring-destructive/40' : undefined}>
      <CardHeader>
        {/* CardTitle renders a div, so the real heading goes inside it. */}
        <CardTitle>
          <h3>{name}</h3>
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

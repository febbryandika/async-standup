import Link from 'next/link'

import { AvatarInitials } from '@/components/avatar-initials'
import type { AttendanceRow, AttendanceTone } from '@/lib/attendance'
import { formatDateShort, formatWeekdayShort } from '@/lib/date'

const TONE_CLASS: Record<AttendanceTone, string> = {
  posted: 'bg-tint-mint',
  blocked: 'bg-destructive/60',
  missing: 'bg-muted',
}

/**
 * Every square is also announced in words. SPEC §6.2's rule about the Blocker
 * badge applies with more force here — a fourteen-by-six wall of colour is
 * exactly the chart that becomes unreadable without it.
 */
const TONE_LABEL: Record<AttendanceTone, string> = {
  posted: 'posted',
  blocked: 'posted, blocked',
  missing: 'no update',
}

const LEGEND = [
  { tone: 'posted', label: 'Posted' },
  { tone: 'blocked', label: 'Blocked' },
  { tone: 'missing', label: 'No update' },
] as const

type AttendanceMatrixProps = {
  rows: AttendanceRow[]
  dates: string[]
  /** The date the feed below is showing, highlighted in the header. */
  selected: string
  /** So a jump from the grid keeps the blockers filter on. */
  blockersOnly: boolean
}

/**
 * The fortnight at a glance, above the feed on /team.
 *
 * A real `<table>` rather than the design's grid of divs: this is tabular data,
 * and the row and column headers are what make a cell mean anything when it is
 * read out one at a time.
 *
 * Only the column headers are links — fourteen tab stops, one per day. Making
 * every square a link, as the prototype does, would put eighty-four of them
 * between the filter and the feed for a keyboard user, to reach the same
 * fourteen destinations.
 */
export function AttendanceMatrix({
  rows,
  dates,
  selected,
  blockersOnly,
}: AttendanceMatrixProps) {
  function hrefFor(date: string): string {
    const params = new URLSearchParams({ date })
    if (blockersOnly) params.set('blockers', 'on')
    return `/team?${params}`
  }

  return (
    <section
      aria-labelledby="attendance-heading"
      className="bg-card shadow-card mt-5 overflow-hidden rounded-2xl border"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3">
        <h2 id="attendance-heading" className="text-sm font-semibold">
          Last {dates.length} weekdays
        </h2>
        <p className="text-muted-foreground text-xs">
          Pick a day to move the feed
        </p>
        <ul className="text-muted-foreground ms-auto flex items-center gap-3.5 text-xs">
          {LEGEND.map(({ tone, label }) => (
            <li key={tone} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`block size-2.5 rounded-[0.2rem] ${TONE_CLASS[tone]}`}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto px-4 py-3.5">
        <table className="w-full border-separate border-spacing-1">
          <caption className="sr-only">
            Which members posted on each of the last {dates.length} weekdays
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-40 min-w-32">
                <span className="sr-only">Member</span>
              </th>
              {dates.map((date) => (
                <th key={date} scope="col" className="min-w-4">
                  <Link
                    href={hrefFor(date)}
                    aria-current={date === selected ? 'true' : undefined}
                    className={`flex flex-col items-center gap-px rounded-md py-0.5 text-[0.65rem] leading-tight font-semibold no-underline ${
                      date === selected
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span aria-hidden>{formatWeekdayShort(date)}</span>
                    <span aria-hidden>{date.slice(-2)}</span>
                    <span className="sr-only">{formatDateShort(date)}</span>
                  </Link>
                </th>
              ))}
              <th
                scope="col"
                className="text-muted-foreground w-14 text-end text-[0.65rem] font-semibold tracking-wider uppercase"
              >
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <th scope="row" className="text-start font-normal">
                  <span className="flex items-center gap-2">
                    <AvatarInitials
                      name={row.name}
                      className="size-6 text-[0.6rem]"
                    />
                    <span className="truncate text-xs font-medium">
                      {row.name}
                    </span>
                  </span>
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.date}>
                    <span
                      aria-hidden
                      className={`block h-5.5 rounded-[0.3rem] ${TONE_CLASS[cell.tone]}`}
                    />
                    <span className="sr-only">{TONE_LABEL[cell.tone]}</span>
                  </td>
                ))}
                <td className="text-muted-foreground text-end text-xs font-medium">
                  {row.rate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

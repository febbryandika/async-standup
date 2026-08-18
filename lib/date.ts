/** Today's date as 'YYYY-MM-DD' in the given IANA timezone. */
export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // en-CA formats as YYYY-MM-DD
}

/** How Next hands a search param over: absent, one value, or repeated. */
export type SearchParam = string | string[] | undefined

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * True only for a date that actually exists. The regex alone is not enough:
 * `new Date('2026-02-31T00:00:00Z')` neither throws nor returns NaN, it rolls
 * forward to 2026-03-03. Formatting the parsed value back and comparing is what
 * rejects the 31st of February. (Only an out-of-range month or a day above 31
 * produces NaN — '2026-13-01' does, '2026-04-31' does not.)
 */
export function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false

  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

/**
 * SPEC §6.1: an invalid `?date=` falls back to today rather than throwing — a
 * stale bookmark should still open on something.
 *
 * A repeated param arrives as an array, which is not a date either. Falling
 * back beats taking the first element: there is no way to tell which of two
 * dates the reader meant.
 */
export function parseDateParam(param: SearchParam, timeZone: string): string {
  return typeof param === 'string' && isCalendarDate(param)
    ? param
    : todayInTimezone(timeZone)
}

/**
 * SPEC §3.5's `?before=` cursor. An unusable one means "start at the newest
 * page", not an error, so garbage and absence collapse to the same undefined.
 */
export function parseCursorParam(param: SearchParam): string | undefined {
  return typeof param === 'string' && isCalendarDate(param) ? param : undefined
}

/** A 'YYYY-MM-DD' team-local date rendered for display. */
export function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    // The string is already a calendar date in the team's zone, so it has no
    // business being re-interpreted. Parsing it as UTC and formatting in UTC is
    // what stops '2026-08-17' from rendering as the 16th west of Greenwich.
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))
}

/**
 * When the next digest lands, in a team's own zone.
 *
 * `vercel.json` schedules the cron at `0 0 * * *`, so the send is 00:00 UTC —
 * 09:00 in Asia/Tokyo, but not in anyone else's zone. Rendering a hardcoded
 * "09:00" next to a configurable timezone would be a lie for every team that
 * changed it, so the one fixed instant is what gets formatted.
 *
 * The *next* such instant rather than a fixed calendar date, because a zone
 * that observes DST is an hour off for half the year otherwise.
 */
export function nextDigestInTimezone(
  timeZone: string,
  now: Date = new Date(),
): { time: string; day: 'today' | 'tomorrow' } {
  const next = new Date(now)
  next.setUTCHours(0, 0, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(next)

  return {
    time,
    // Same team-local calendar day as right now, or the one after it.
    day:
      formatInTimezone(next, timeZone) === formatInTimezone(now, timeZone)
        ? 'today'
        : 'tomorrow',
  }
}

function formatInTimezone(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/** The same calendar date, `days` later (or earlier, for a negative count). */
export function shiftDate(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + days)
  return at.toISOString().slice(0, 10)
}

/** '2026-08-14' → '14 Aug'. For column headers, where the year is redundant. */
export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00Z`))
}

/** '2026-08-14' → 'Fri'. */
export function formatWeekdayShort(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00Z`))
}

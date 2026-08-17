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

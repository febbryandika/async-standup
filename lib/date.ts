/** Today's date as 'YYYY-MM-DD' in the given IANA timezone. */
export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // en-CA formats as YYYY-MM-DD
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

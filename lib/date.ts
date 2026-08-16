/** Today's date as 'YYYY-MM-DD' in the given IANA timezone. */
export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // en-CA formats as YYYY-MM-DD
}

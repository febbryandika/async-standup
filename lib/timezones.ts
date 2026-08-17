/** The team timezone SPEC §3.1 defaults to — it defines what "today" means. */
export const DEFAULT_TIMEZONE = 'Asia/Tokyo'

// Intl.supportedValuesOf omits 'UTC' and every Etc/* zone, but
// Intl.DateTimeFormat accepts 'UTC' happily — so it is prepended rather than
// left unreachable. One list feeds both the <select> and the Zod refine, which
// is what stops the picker and the validator from drifting apart.
export const TIMEZONES: readonly string[] = [
  'UTC',
  ...Intl.supportedValuesOf('timeZone'),
]

/**
 * Guards `todayInTimezone`, which throws a RangeError on an unknown zone. A
 * team has no edit surface, so an unvalidated timezone would break every one
 * of its pages permanently — this is the only place that can catch it.
 */
export function isValidTimezone(value: string): boolean {
  return TIMEZONES.includes(value)
}

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { isCalendarDate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DatePickerProps = {
  date: string
  blockersOnly: boolean
  /** Latest selectable day — today in the team's timezone. */
  max: string
}

function hrefFor(date: string, blockersOnly: boolean): string {
  const params = new URLSearchParams({ date })
  // 'on' is what a browser sends for a checkbox with no value attribute, so
  // this URL is byte-identical to the one a no-JS submit produces.
  if (blockersOnly) params.set('blockers', 'on')
  return `/team?${params}`
}

/**
 * SPEC §3.4's date picker and blockers toggle, in one component because they
 * drive one navigation: split in two, each would need the other's value to
 * build a URL.
 *
 * The feed itself stays server-rendered — this only chooses the address.
 */
export function DatePicker({ date, blockersOnly, max }: DatePickerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function go(nextDate: string, nextBlockersOnly: boolean) {
    startTransition(() => router.push(hrefFor(nextDate, nextBlockersOnly)))
  }

  return (
    // method="get" action="/team" is the whole no-JS story: the browser builds
    // the same query string from the same field names. The handlers below only
    // save a click, so there is one URL contract rather than two.
    <form
      method="get"
      action="/team"
      aria-busy={isPending}
      className="mt-6 flex flex-wrap items-end gap-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="feed-date">Date</Label>
        <Input
          // Uncontrolled, so a half-entered date is never clobbered mid-edit,
          // but keyed on the value the server rendered so a Back navigation
          // re-mounts the field instead of leaving it showing a date the feed
          // below is no longer for. Keyed per field, not on the form: keying
          // the form would steal focus on every navigation.
          key={date}
          id="feed-date"
          type="date"
          name="date"
          defaultValue={date}
          max={max}
          className="w-auto"
          // React's onChange is the native `input` event, which fires while the
          // date is still half-typed and reports ''. Navigating only on a real
          // calendar date is what stops the page bouncing to today between
          // keystrokes.
          onChange={(event) => {
            if (isCalendarDate(event.target.value)) {
              go(event.target.value, blockersOnly)
            }
          }}
        />
      </div>

      <Label htmlFor="feed-blockers" className="h-8">
        {/* A native checkbox rather than a Radix one: it submits itself with JS
            off, which a button plus a hidden input only imitates. */}
        <input
          key={String(blockersOnly)}
          id="feed-blockers"
          type="checkbox"
          name="blockers"
          defaultChecked={blockersOnly}
          className="size-4 accent-destructive"
          onChange={(event) => go(date, event.target.checked)}
        />
        Blockers only
      </Label>

      {/* Always rendered rather than hidden behind a no-js class: it is the
          fallback path, and a perfectly good keyboard affordance otherwise. */}
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        Apply
      </Button>

      <span aria-live="polite" className="sr-only">
        {isPending ? 'Loading updates' : ''}
      </span>
    </form>
  )
}

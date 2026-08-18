'use client'

import { useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { isCalendarDate, shiftDate } from '@/lib/date'
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

  const previousDay = shiftDate(date, -1)
  const nextDay = shiftDate(date, 1)

  return (
    // method="get" action="/team" is the whole no-JS story: the browser builds
    // the same query string from the same field names. The handlers below only
    // save a click, so there is one URL contract rather than two.
    <form
      method="get"
      action="/team"
      aria-busy={isPending}
      className="bg-card shadow-card mt-5 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-2xl border px-4 py-3.5"
    >
      <div className="grid gap-1.5">
        <Label
          htmlFor="feed-date"
          className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
        >
          Date
        </Label>
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
            off, which a button plus a hidden input only imitates.

            Controlled, unlike the date field above, and deliberately not keyed.
            It used to be `defaultChecked` with `key={String(blockersOnly)}`,
            which meant every toggle re-mounted the input — and a re-mounted
            element loses focus, dumping a keyboard user back to the top of the
            document mid-filter. SPEC §6.2 asks for the toggle to be part of the
            keyboard path; being thrown out of it on use is the opposite.

            A checkbox has no half-entered state for a controlled value to
            clobber, which is the one thing that rules the approach out for the
            date input. The cost is that the box stays unticked for the length of
            the navigation instead of ticking immediately — which is the truth:
            aria-busy and the live region below are already saying the same
            thing. It also fixes Back, which the key was there for. */}
        <input
          id="feed-blockers"
          type="checkbox"
          name="blockers"
          checked={blockersOnly}
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

      {/* After the submit button in DOM order on purpose: SPEC §6.2's keyboard
          path for this page is Date → Blockers only → Apply, and these are a
          shortcut on top of it, not a step in it. Plain links, so they are the
          same server render the form produces and work with JS off. */}
      <div className="ms-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={hrefFor(previousDay, blockersOnly)}>
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.9} />
            <span className="sr-only">Previous day</span>
          </Link>
        </Button>

        {nextDay <= max ? (
          <Button asChild variant="ghost" size="icon-sm">
            <Link href={hrefFor(nextDay, blockersOnly)}>
              <ChevronRight aria-hidden className="size-4" strokeWidth={1.9} />
              <span className="sr-only">Next day</span>
            </Link>
          </Button>
        ) : null}

        {date === max ? null : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(max, blockersOnly)}>Jump to today</Link>
          </Button>
        )}
      </div>

      <span aria-live="polite" className="sr-only">
        {isPending ? 'Loading updates' : ''}
      </span>
    </form>
  )
}

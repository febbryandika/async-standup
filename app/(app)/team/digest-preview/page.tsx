import type { Metadata } from 'next'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateLong, parseDateParam, todayInTimezone } from '@/lib/date'
import { buildDigestHtml } from '@/lib/digest-html'
import { listTeamMembers, listTeamStandups } from '@/lib/queries'
import { requireMember } from '@/lib/session'

export const metadata: Metadata = { title: 'Digest preview' }

/**
 * SPEC §3.6. Read-only, and available to any member rather than admins only: it
 * exists so the email — the deliverable a reviewer would otherwise never see —
 * can be read and screenshotted without waiting for midnight.
 *
 * It imports lib/digest-html, never lib/digest. No Resend client and no API key
 * is reachable from this file, so "sends nothing" is a property of the import
 * graph rather than a promise in a comment.
 */
export default async function DigestPreviewPage({
  searchParams,
}: PageProps<'/team/digest-preview'>) {
  const { team } = await requireMember()

  const params = await searchParams
  // SPEC §6.1: an unparseable ?date= falls back to today rather than throwing.
  const date = parseDateParam(params.date, team.timezone)

  const [members, standups] = await Promise.all([
    listTeamMembers(team.id),
    listTeamStandups(team.id, date),
  ])

  // Exactly the call sendDigests makes, from exactly the same two queries. That
  // identity is the point of the page: what this frame shows, the email is.
  const html = buildDigestHtml(team.name, date, members, standups)

  return (
    <>
      <PageHeader
        meta={
          <>
            <time dateTime={date}>{formatDateLong(date)}</time>
            <span aria-hidden>·</span>
            {team.timezone}
          </>
        }
        title="Digest preview"
        description={`Exactly what lands in every ${team.name} inbox each morning. This page only renders it — nothing is sent from here.`}
      />

      {/*
        A plain GET form rather than <DatePicker>: that component hardcodes
        action="/team" in both the form and hrefFor(), and it owns the blockers
        toggle, which this page has no filter for. Generalising it would mean
        threading a route through both and deciding what a blockers checkbox
        means here — more surface for less. With no router.push there is also no
        key= remount to get right.
      */}
      <form
        method="get"
        action="/team/digest-preview"
        className="bg-card shadow-card mt-5 flex max-w-4xl flex-wrap items-end gap-4 rounded-2xl border px-4 py-3.5"
      >
        <div className="grid gap-1.5">
          <Label
            htmlFor="digest-date"
            className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
          >
            Date
          </Label>
          <Input
            // Keyed on the rendered value so a Back navigation re-mounts the
            // field rather than leaving it showing a date the frame is not for.
            key={date}
            id="digest-date"
            type="date"
            name="date"
            defaultValue={date}
            max={todayInTimezone(team.timezone)}
            className="w-auto"
          />
        </div>
        <Button type="submit" variant="outline">
          Preview
        </Button>
      </form>

      <section
        aria-labelledby="digest-frame-heading"
        className="bg-card shadow-card mt-5 max-w-4xl overflow-hidden rounded-2xl border"
      >
        <div className="flex flex-col gap-1 border-b px-4 py-3">
          <h2 id="digest-frame-heading" className="text-sm font-semibold">
            Team Standup – {date}
          </h2>
          <p className="text-muted-foreground text-xs">
            {members.length} {members.length === 1 ? 'recipient' : 'recipients'}{' '}
            · <time dateTime={date}>{formatDateLong(date)}</time>
          </p>
        </div>

        {/*
          An iframe, not dangerouslySetInnerHTML. Three reasons, in order of
          weight:

          Fidelity — Tailwind v4's preflight zeroes margins and resets h1–h6 to
          inherit, so inlining the digest would render it as unstyled prose and
          misrepresent the thing this page exists to show. A separate document is
          the only faithful render, and it also cannot inherit the app's dark
          theme, which email never has.

          Blast radius — the digest is built from author-written text.
          buildDigestHtml escapes it, but sandbox="" puts the result in an opaque
          origin with scripts, forms and top-navigation all disabled, so one
          escaping bug is not an XSS in the authenticated app's own origin.

          Semantics — the digest has its own <h1>. Inlined, this page would have
          two, and an outline that made no sense. In a frame it is a separate
          document whose accessible name to this one is the title below.

          Fixed height because an iframe cannot size to its content without JS.
          It scrolls internally, as a mail client does.
        */}
        <iframe
          title={`Digest email for ${formatDateLong(date)}`}
          srcDoc={html}
          sandbox=""
          className="h-[70vh] w-full bg-white"
        />
      </section>
    </>
  )
}

import type { Metadata } from 'next'

import { AvatarInitials } from '@/components/avatar-initials'
import { InviteCodeActions } from '@/components/invite-code-actions'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import {
  buildAttendanceGrid,
  weekdaysEndingAt,
  type AttendanceTone,
} from '@/lib/attendance'
import { formatDateShort, todayInTimezone } from '@/lib/date'
import {
  listLastPosted,
  listTeamAttendance,
  listTeamMembers,
} from '@/lib/queries'
import { requireAdmin } from '@/lib/session'

export const metadata: Metadata = { title: 'Team settings' }

/** Two working weeks — enough to see a habit, short enough to fit the row. */
const STRIP_DAYS = 10

const TONE_CLASS: Record<AttendanceTone, string> = {
  posted: 'bg-tint-mint',
  blocked: 'bg-destructive/60',
  missing: 'bg-muted',
}

const TONE_LABEL: Record<AttendanceTone, string> = {
  posted: 'posted',
  blocked: 'posted, blocked',
  missing: 'no update',
}

export default async function TeamSettingsPage() {
  // SPEC §8: the gate is here, server-side. The nav link in (app)/layout.tsx is
  // also role-gated, but that is cosmetics — this is the part that holds.
  // A member gets notFound(), not this page with the controls hidden.
  const { team } = await requireAdmin()

  const dates = weekdaysEndingAt(todayInTimezone(team.timezone), STRIP_DAYS)
  const [members, attendance, lastPosted] = await Promise.all([
    listTeamMembers(team.id),
    listTeamAttendance(team.id, dates),
    listLastPosted(team.id),
  ])

  const grid = buildAttendanceGrid(members, dates, attendance)
  const lastByMember = new Map(
    lastPosted.map((row) => [row.userId, row.date] as const),
  )

  return (
    <>
      <PageHeader
        meta={`${team.name} · ${team.timezone}`}
        title="Team settings"
        description="You are the admin of this team. A member gets a 404 here."
      />

      <section
        aria-labelledby="invite-code-heading"
        className="bg-card shadow-card mt-6 flex max-w-5xl flex-col gap-4 rounded-2xl border p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 id="invite-code-heading" className="text-base font-semibold">
            Invite code
          </h2>
          <p className="text-muted-foreground text-sm">
            Anyone holding this code can join {team.name}. Regenerate it the
            moment it leaks.
          </p>
        </div>

        <p className="bg-muted rounded-xl border border-dashed px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.22em]">
          {team.inviteCode}
        </p>

        <InviteCodeActions code={team.inviteCode} />
      </section>

      <section
        aria-labelledby="members-heading"
        className="bg-card shadow-card mt-5 max-w-5xl overflow-hidden rounded-2xl border"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3.5">
          <h2 id="members-heading" className="text-base font-semibold">
            Members
          </h2>
          <p className="text-muted-foreground text-sm">
            {members.length} · one team each, enforced by the database
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Every member of {team.name}, with how often they have posted over
              the last {dates.length} weekdays
            </caption>
            <thead>
              <tr className="bg-muted text-muted-foreground text-[0.65rem] tracking-wider uppercase">
                <th
                  scope="col"
                  className="px-4 py-2.5 text-start font-semibold"
                >
                  Member
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-start font-semibold"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-start font-semibold"
                >
                  Last {dates.length} weekdays
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-start font-semibold"
                >
                  Last posted
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-semibold">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => {
                const member = members.find((m) => m.userId === row.userId)
                const last = lastByMember.get(row.userId)

                return (
                  <tr key={row.userId} className="border-t">
                    <th
                      scope="row"
                      className="px-4 py-3 text-start font-normal"
                    >
                      <span className="flex items-center gap-2.5">
                        <AvatarInitials name={row.name} className="size-7.5" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-semibold">
                            {row.name}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {member?.email}
                          </span>
                        </span>
                      </span>
                    </th>
                    <td className="px-4 py-3">
                      {member?.role === 'admin' ? (
                        <Badge className="bg-tint-blue text-tint-blue-foreground">
                          Admin
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">
                          Member
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex gap-1">
                        {row.cells.map((cell) => (
                          <span key={cell.date} className="contents">
                            <span
                              aria-hidden
                              className={`block size-3.5 rounded-[0.25rem] ${TONE_CLASS[cell.tone]}`}
                            />
                            <span className="sr-only">
                              {formatDateShort(cell.date)}:{' '}
                              {TONE_LABEL[cell.tone]}.{' '}
                            </span>
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {last ? formatDateShort(last) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-end font-medium">
                      {row.rate}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

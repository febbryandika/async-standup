import { LogOut, Mail } from 'lucide-react'

import { signOutAction } from '@/actions/auth'
import { AppNav, AppTabBar } from '@/components/app-nav'
import { AvatarInitials } from '@/components/avatar-initials'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { nextDigestInTimezone } from '@/lib/date'
import { countTeamMembers } from '@/lib/queries'
import { requireMember } from '@/lib/session'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // The guard, and the shell's data source. Every page under (app) calls this
  // too: a layout does not re-render on navigation and does not gate its child
  // segments, so on its own it is chrome, not access control.
  const { user, member, team } = await requireMember()
  const memberCount = await countTeamMembers(team.id)
  const digest = nextDigestInTimezone(team.timezone)
  const isAdmin = member.role === 'admin'

  return (
    <div className="md:grid md:grid-cols-[15.5rem_1fr]">
      <aside className="bg-sidebar sticky top-0 hidden h-dvh flex-col gap-5 border-r px-3.5 py-5 md:flex">
        <Brand subtitle={team.name} className="px-1.5" />

        <AppNav isAdmin={isAdmin} />

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wider uppercase">
              <Mail aria-hidden className="size-3.5" strokeWidth={1.75} />
              Next digest
            </span>
            <span className="text-sm font-semibold">
              {digest.day === 'today' ? 'Today' : 'Tomorrow'}, {digest.time}
            </span>
            <span className="text-muted-foreground text-xs">
              {team.timezone} · to {memberCount}{' '}
              {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className="flex items-center gap-2 border-t px-1.5 pt-3">
            <AvatarInitials name={user.name} className="size-7.5" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-[0.7rem]">
                {isAdmin ? 'Admin' : 'Member'}
              </span>
            </span>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              >
                <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="bg-card sticky top-0 z-5 flex items-center gap-2.5 border-b px-4 py-2.5 md:hidden">
          <Brand subtitle={team.name} />
          <div className="ms-auto flex items-center gap-1">
            <ThemeToggle />
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              >
                <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </header>

        {/* pb-24 clears the fixed tab bar, which would otherwise sit on top of
            whatever the last control on the page is. */}
        <main className="mx-auto max-w-[76rem] px-4 pt-6 pb-24 md:px-10 md:pt-8 md:pb-14">
          {children}
        </main>
      </div>

      <AppTabBar isAdmin={isAdmin} />
    </div>
  )
}

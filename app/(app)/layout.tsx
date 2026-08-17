import Link from 'next/link'

import { signOutAction } from '@/actions/auth'
import { requireMember } from '@/lib/session'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { href: '/', label: 'Today' },
  { href: '/history', label: 'History' },
  { href: '/team', label: 'Team' },
  // Unconditional, unlike Settings below: SPEC §3.6 makes the preview visible to
  // every member, and the digest is this project's main deliverable — reachable
  // only by typing the URL, it may as well not exist.
  { href: '/team/digest-preview', label: 'Digest' },
] as const

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // The guard, and the nav's data source. Every page under (app) calls this
  // too: a layout does not re-render on navigation and does not gate its child
  // segments, so on its own it is chrome, not access control.
  const { user, member, team } = await requireMember()

  return (
    <>
      <nav aria-label="Main" className="border-b">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}

          {member.role === 'admin' ? (
            <Link
              href="/team/settings"
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          ) : null}

          <span className="ms-auto flex items-center gap-3 text-muted-foreground">
            <span>
              {team.name} · {user.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </span>
        </div>
      </nav>
      {children}
    </>
  )
}

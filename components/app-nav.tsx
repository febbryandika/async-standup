'use client'

import { History, Mail, Settings, Sun, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/**
 * Icons are components, and a server component cannot hand a component to a
 * client one across the boundary — so the whole list lives here rather than
 * being passed in. The layout only decides whether Settings is in it.
 */
const NAV_ITEMS = [
  { href: '/', label: 'Today', Icon: Sun },
  { href: '/team', label: 'Team', Icon: Users },
  { href: '/history', label: 'History', Icon: History },
  { href: '/team/digest-preview', label: 'Digest', Icon: Mail },
  {
    href: '/team/settings',
    label: 'Settings',
    Icon: Settings,
    adminOnly: true,
  },
] as const

type NavProps = { isAdmin: boolean }

/**
 * Exact match, not prefix: /team/settings and /team/digest-preview are their
 * own destinations, and a prefix test would light up Team on all three.
 */
function useIsCurrent() {
  const pathname = usePathname()
  return (href: string) => pathname === href
}

function visibleItems(isAdmin: boolean) {
  return NAV_ITEMS.filter((item) => !('adminOnly' in item) || isAdmin)
}

/** The desktop rail. Hidden below md, where the tab bar takes over. */
export function AppNav({ isAdmin }: NavProps) {
  const isCurrent = useIsCurrent()

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {visibleItems(isAdmin).map(({ href, label, Icon }) => {
        const current = isCurrent(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
              current
                ? 'bg-primary text-primary-foreground'
                : 'text-secondary-foreground hover:bg-muted',
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * The mobile bar. `hidden md:…` on both navs means only one is ever in the
 * accessibility tree — two landmarks named "Main" would be an axe violation,
 * and display:none keeps this one out of it entirely.
 */
export function AppTabBar({ isAdmin }: NavProps) {
  const isCurrent = useIsCurrent()

  return (
    <nav
      aria-label="Main"
      className="bg-card fixed inset-x-0 bottom-0 z-10 flex border-t px-1.5 pt-1.5 pb-2 md:hidden"
    >
      {visibleItems(isAdmin).map(({ href, label, Icon }) => {
        const current = isCurrent(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[0.65rem] font-medium',
              current ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon aria-hidden className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

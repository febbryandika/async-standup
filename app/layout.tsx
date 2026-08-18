import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { THEME_COOKIE, isTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Async Standup',
    template: '%s · Async Standup',
  },
  description:
    'Async standup for distributed teams: post a daily update, get the team’s digest by email each morning.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Read while rendering, so the first paint is already the chosen palette.
  // The alternative — localStorage plus a blocking inline script — buys nothing
  // here: every route behind this layout is already dynamic.
  const theme = (await cookies()).get(THEME_COOKIE)?.value

  return (
    <html
      lang="en"
      className={cn('font-sans', inter.variable, isTheme(theme) && theme)}
    >
      {/* No wordmark bar here any more: inside (app) the sidebar carries the
          brand, and the three routes outside it render <SiteHeader /> or the
          auth split themselves. */}
      <body className="bg-background text-foreground min-h-dvh">
        {children}
      </body>
    </html>
  )
}

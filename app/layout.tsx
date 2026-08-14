import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Async Standup',
    template: '%s · Async Standup',
  },
  description:
    'Async standup for distributed teams: post a daily update, get the team’s digest by email each morning.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="bg-background text-foreground min-h-dvh">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
            <span className="font-medium">Async Standup</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}

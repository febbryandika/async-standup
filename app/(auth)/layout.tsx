import type { ReactNode } from 'react'
import { Mail, ShieldCheck, TriangleAlert } from 'lucide-react'

import { Brand } from '@/components/brand'

const PITCH = [
  {
    Icon: ShieldCheck,
    tint: 'bg-tint-mint text-tint-mint-foreground',
    text: 'Written once, in your team’s own timezone',
  },
  {
    Icon: TriangleAlert,
    tint: 'bg-destructive/10 text-destructive',
    text: 'Blockers lead the digest, never buried',
  },
  {
    Icon: Mail,
    tint: 'bg-tint-blue text-tint-blue-foreground',
    text: 'One email a morning. No bot in your chat.',
  },
] as const

/**
 * The split screen behind /login and /register. The aside is decoration and
 * drops below md, where the form is the only thing worth the width — the mark
 * moves inline above the card so the page still says what it is.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="bg-muted hidden flex-col justify-center gap-8 border-r px-13 py-14 md:flex">
        <Brand />

        <div className="flex flex-col gap-3.5">
          <h2 className="max-w-[22ch] text-4xl leading-[1.08] font-bold tracking-tight">
            Standup, without the standup.
          </h2>
          <p className="text-muted-foreground max-w-[44ch] leading-relaxed">
            Post two lines when your day starts. Everyone reads the team’s
            digest with their coffee — blockers first.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {PITCH.map(({ Icon, tint, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`grid size-6.5 shrink-0 place-items-center rounded-lg ${tint}`}
              >
                <Icon className="size-3.5" strokeWidth={1.9} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      <div className="grid place-items-center px-4 py-10 md:px-6 md:py-11">
        <div className="flex w-full max-w-[24.5rem] flex-col gap-6">
          <Brand className="md:hidden" />
          {children}
        </div>
      </div>
    </div>
  )
}

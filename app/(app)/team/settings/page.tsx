import type { Metadata } from 'next'

import { requireAdmin } from '@/lib/session'
import { InviteCodeActions } from '@/components/invite-code-actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Team settings' }

export default async function TeamSettingsPage() {
  // SPEC §8: the gate is here, server-side. The nav link in (app)/layout.tsx is
  // also role-gated, but that is cosmetics — this is the part that holds.
  // A member gets notFound(), not this page with the controls hidden.
  const { team } = await requireAdmin()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-medium">Team settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {team.name} · {team.timezone}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            <h2>Invite code</h2>
          </CardTitle>
          <CardDescription>
            Anyone with this code can join {team.name}. Regenerate it if it
            leaks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="font-mono text-2xl tracking-widest">
            {team.inviteCode}
          </p>
          <InviteCodeActions code={team.inviteCode} />
        </CardContent>
      </Card>
    </main>
  )
}

import { requireMember } from '@/lib/session'

// The admin-only check lands in SPEC §13 step 9, alongside the invite code this
// page will actually show. Until then there is nothing here worth gating.
export default async function TeamSettingsPage() {
  await requireMember()

  return <main className="mx-auto max-w-3xl px-4 py-8">Team settings</main>
}

import { requireMember } from '@/lib/session'

export default async function TeamPage() {
  await requireMember()

  return <main className="mx-auto max-w-3xl px-4 py-8">Team</main>
}

import { requireMember } from '@/lib/session'

export default async function DigestPreviewPage() {
  await requireMember()

  return <main className="mx-auto max-w-3xl px-4 py-8">Digest preview</main>
}

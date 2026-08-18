import Link from 'next/link'

import { Brand } from '@/components/brand'

/**
 * The slim bar for the three routes that render outside the app shell —
 * /onboarding and the 404, which have no sidebar to carry the mark. The auth
 * routes use their own split layout instead.
 */
export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link href="/" className="text-foreground no-underline">
          <Brand />
        </Link>
      </div>
    </header>
  )
}

import { Moon, Sun } from 'lucide-react'
import { cookies } from 'next/headers'

import { setThemeAction } from '@/actions/theme'
import { Button } from '@/components/ui/button'
import { THEME_COOKIE, isTheme, otherTheme, type Theme } from '@/lib/theme'

/**
 * A form, not a click handler: the whole theme round trip is a cookie write
 * plus a re-render, so there is nothing here that needs JavaScript. The `next`
 * value travels in a hidden input rather than being derived in the action, which
 * keeps the action itself free of "what was it before?".
 */
export async function ThemeToggle({ className }: { className?: string }) {
  const cookie = (await cookies()).get(THEME_COOKIE)?.value
  const theme: Theme = isTheme(cookie) ? cookie : 'light'
  const next = otherTheme(theme)

  return (
    <form action={setThemeAction} className={className}>
      <input type="hidden" name="theme" value={next} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
      >
        {theme === 'dark' ? (
          <Sun aria-hidden className="size-4" strokeWidth={1.75} />
        ) : (
          <Moon aria-hidden className="size-4" strokeWidth={1.75} />
        )}
        <span className="sr-only">Switch to {next} theme</span>
      </Button>
    </form>
  )
}

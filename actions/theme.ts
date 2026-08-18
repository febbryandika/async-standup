'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { THEME_COOKIE, isTheme, type Theme } from '@/lib/theme'

/**
 * Flips the colour scheme and remembers it.
 *
 * A cookie rather than localStorage, and a Server Action rather than a click
 * handler: the root layout reads the cookie while it renders, so the first
 * paint is already the right theme. The localStorage version of this needs a
 * blocking inline script to avoid a flash of the wrong palette, and still has a
 * moment where the DOM and the store disagree.
 *
 * `next` comes from a hidden input rather than being derived here, so the
 * button is a plain form submit and works with JavaScript off.
 */
export async function setThemeAction(formData: FormData): Promise<void> {
  const requested = formData.get('theme')
  const next: Theme = isTheme(requested) ? requested : 'light'

  const store = await cookies()
  store.set(THEME_COOKIE, next, {
    path: '/',
    sameSite: 'lax',
    // A year: the preference is not security-sensitive and there is nothing to
    // expire. httpOnly is left off deliberately — nothing reads it client-side
    // today, but a cookie that only styles a page has no secret to protect.
    maxAge: 60 * 60 * 24 * 365,
  })

  // The theme lives on <html> in the root layout, so the whole tree is what has
  // to re-render — not just the page the toggle happened to be on.
  revalidatePath('/', 'layout')
}

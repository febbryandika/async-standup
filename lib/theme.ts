export const THEME_COOKIE = 'theme'

export type Theme = 'light' | 'dark'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** The other one. What the toggle switches to. */
export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

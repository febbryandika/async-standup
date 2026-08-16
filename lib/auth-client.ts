import { createAuthClient } from 'better-auth/react'

// No baseURL: it falls back to BETTER_AUTH_URL and then to /api/auth, which is
// where the catch-all handler lives. Imported from better-auth/react rather
// than better-auth/client so useSession is a real hook, not a nanostores atom.
export const authClient = createAuthClient()

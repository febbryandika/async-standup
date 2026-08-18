import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/login-form'

export const metadata: Metadata = { title: 'Log in' }

export default function LoginPage() {
  // SPEC §10 keys the demo button on NEXT_PUBLIC_DEMO_EMAIL. Requiring the
  // password too is a deliberate tightening: with the email set and the
  // password missing the button would submit blank and fail with "Email or
  // password is incorrect", which reads as a broken app rather than an
  // unconfigured one.
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL
  const demoPassword = process.env.DEMO_PASSWORD
  const demo =
    demoEmail && demoPassword
      ? { email: demoEmail, password: demoPassword }
      : undefined

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back — pick up where your team left off.
        </p>
      </div>

      <LoginForm demo={demo} />

      <p className="text-muted-foreground text-sm">
        New here?{' '}
        <Link
          href="/register"
          className="text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </main>
  )
}

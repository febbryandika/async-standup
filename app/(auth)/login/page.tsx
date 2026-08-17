import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/login-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
    <main className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Welcome back — pick up where your team left off.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <LoginForm demo={demo} />
          <p className="text-sm text-muted-foreground">
            New here?{' '}
            <Link href="/register" className="underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

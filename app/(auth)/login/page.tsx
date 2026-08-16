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
          <LoginForm />
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

import type { Metadata } from 'next'
import Link from 'next/link'

import { RegisterForm } from '@/components/register-form'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="text-muted-foreground text-sm">
          Takes about twenty seconds.
        </p>
      </div>

      <RegisterForm />

      <p className="text-muted-foreground text-sm">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </main>
  )
}

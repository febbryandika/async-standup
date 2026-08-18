'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { signInAction, type AuthState } from '@/actions/auth'
import { loginSchema, type LoginInput } from '@/lib/validation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const EMPTY_STATE: AuthState = {}

type LoginFormProps = {
  /**
   * SPEC §10's one-click demo access. Passed down from the page rather than
   * read here, because the credentials live in env vars only the server can
   * see — and passed as one object so "email set, password missing" isn't a
   * state this component has to have an opinion about.
   */
  demo?: { email: string; password: string }
}

export function LoginForm({ demo }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    EMPTY_STATE,
  )

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // The action re-parses with the same schema the resolver already ran, so
  // fieldErrors can only come back if something bypassed the form. Fall back to
  // showing one rather than failing silently.
  const serverMessage = state.error ?? Object.values(state.fieldErrors ?? {})[0]

  function handleValid(values: LoginInput) {
    startTransition(() => formAction(values))
  }

  // SPEC §10: fills both fields and submits. Filling them rather than signing
  // in behind the scenes is the point — the reviewer sees which account they
  // are being given, and the credentials are published in the README anyway.
  function submitDemo({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    // shouldValidate: false because handleSubmit runs the same resolver a
    // moment later; validating twice only risks flashing an error mid-fill.
    form.setValue('email', email, { shouldValidate: false })
    form.setValue('password', password, { shouldValidate: false })
    void form.handleSubmit(handleValid)()
  }

  return (
    <Form {...form}>
      {/* noValidate: type="email" still earns the right mobile keyboard, but a
          native constraint failure suppresses the submit event entirely, so
          Zod would never run. One validator, one set of announced messages. */}
      <form
        noValidate
        onSubmit={form.handleSubmit(handleValid)}
        className="grid gap-4 [&_button]:h-10 [&_input]:h-10 [&_select]:h-10"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* empty:sr-only, not conditional rendering: the region has to be in
            the accessibility tree before it has anything to say, but an empty
            one should not open a gap in the form. */}
        <div aria-live="polite" className="empty:sr-only">
          {serverMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{serverMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>

        {/* type="button" keeps it out of the implicit-submit path, and the
            shared disabled state stops a double click firing two sign-ins. */}
        {demo ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => submitDemo(demo)}
          >
            Use demo account
          </Button>
        ) : null}
      </form>
    </Form>
  )
}

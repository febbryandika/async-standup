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

export function LoginForm() {
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

  return (
    <Form {...form}>
      {/* noValidate: type="email" still earns the right mobile keyboard, but a
          native constraint failure suppresses the submit event entirely, so
          Zod would never run. One validator, one set of announced messages. */}
      <form
        noValidate
        onSubmit={form.handleSubmit(handleValid)}
        className="grid gap-4"
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

        <div aria-live="polite">
          {serverMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{serverMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Form>
  )
}

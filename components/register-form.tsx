'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { signUpAction, type AuthState } from '@/actions/auth'
import { registerSchema, type RegisterInput } from '@/lib/validation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const EMPTY_STATE: AuthState = {}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    EMPTY_STATE,
  )

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const serverMessage = state.error ?? Object.values(state.fieldErrors ?? {})[0]

  function handleValid(values: RegisterInput) {
    startTransition(() => formAction(values))
  }

  return (
    <Form {...form}>
      {/* noValidate — see login-form.tsx: native validation would block submit
          before Zod ever runs. */}
      <form
        noValidate
        onSubmit={form.handleSubmit(handleValid)}
        className="grid gap-4 [&_button]:h-10 [&_input]:h-10 [&_select]:h-10"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>At least 8 characters.</FormDescription>
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
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Form>
  )
}

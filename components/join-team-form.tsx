'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { joinTeamAction, type TeamState } from '@/actions/teams'
import { joinTeamSchema, type JoinTeamInput } from '@/lib/validation'
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

const EMPTY_STATE: TeamState = {}

export function JoinTeamForm() {
  const [state, formAction, isPending] = useActionState(
    joinTeamAction,
    EMPTY_STATE,
  )

  const form = useForm<JoinTeamInput>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: { inviteCode: '' },
  })

  const serverMessage = state.error ?? Object.values(state.fieldErrors ?? {})[0]

  function handleValid(values: JoinTeamInput) {
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
          name="inviteCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invite code</FormLabel>
              <FormControl>
                {/* Lowercase is accepted — the action uppercases before it
                    looks the code up — but the phone keyboard may as well
                    start in the shape the code is printed in. */}
                <Input
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={6}
                  placeholder="K7M2QX"
                  className="h-13! font-mono text-xl font-bold tracking-[0.22em] uppercase"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Six characters, from whoever set the team up.
              </FormDescription>
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

        {/* Outline, against the solid Create team beside it: joining is the
            second path, and two identical primary buttons make the choice
            harder to read than it is. */}
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? 'Joining team…' : 'Join team'}
        </Button>
      </form>
    </Form>
  )
}

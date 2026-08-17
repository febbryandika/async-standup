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
        className="grid gap-4"
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
                  className="font-mono tracking-widest uppercase"
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

        <div aria-live="polite">
          {serverMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{serverMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Joining team…' : 'Join team'}
        </Button>
      </form>
    </Form>
  )
}

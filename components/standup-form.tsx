'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { upsertStandupAction, type StandupState } from '@/actions/standups'
import { standupSchema, type StandupInput } from '@/lib/validation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const EMPTY_STATE: StandupState = {}

type StandupFormProps = {
  standup: { yesterday: string; today: string; blockers: string | null } | null
}

export function StandupForm({ standup }: StandupFormProps) {
  const [state, formAction, isPending] = useActionState(
    upsertStandupAction,
    EMPTY_STATE,
  )

  // Today's row seeds the fields once, on mount. Nothing syncs it afterwards:
  // after a save the user's own text is already what is on screen, and the
  // action never rewrites what they typed.
  const form = useForm<StandupInput>({
    resolver: zodResolver(standupSchema),
    defaultValues: {
      yesterday: standup?.yesterday ?? '',
      today: standup?.today ?? '',
      blockers: standup?.blockers ?? '',
    },
  })

  // The action re-parses with the same schema the resolver already ran, so
  // fieldErrors can only come back if something bypassed the form. Fall back to
  // showing one rather than failing silently.
  const serverMessage = state.error ?? Object.values(state.fieldErrors ?? {})[0]

  function handleValid(values: StandupInput) {
    startTransition(() => formAction(values))
  }

  return (
    <Form {...form}>
      {/* noValidate — see login-form.tsx: a native constraint failure suppresses
          the submit event entirely, so Zod would never run. */}
      <form
        noValidate
        onSubmit={form.handleSubmit(handleValid)}
        className="grid gap-4"
      >
        {standup ? null : (
          <p className="text-sm text-muted-foreground">
            Your first update — what did you work on yesterday?
          </p>
        )}

        <FormField
          control={form.control}
          name="yesterday"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yesterday</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="today"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Today</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="blockers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blockers</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormDescription>
                Optional. Anything holding you up — it leads the team&rsquo;s
                digest.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* The wrapper always renders so the live region exists before it has
            anything to say. Clearing it while pending means a second save
            re-announces rather than repeating identical text into the void. */}
        <div aria-live="polite">
          {isPending ? null : serverMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{serverMessage}</AlertDescription>
            </Alert>
          ) : state.saved ? (
            <p className="text-sm text-muted-foreground">Standup saved</p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="justify-self-start"
        >
          {isPending ? 'Saving…' : 'Save standup'}
        </Button>
      </form>
    </Form>
  )
}

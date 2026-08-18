'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { createTeamAction, type TeamState } from '@/actions/teams'
import { DEFAULT_TIMEZONE, TIMEZONES } from '@/lib/timezones'
import { createTeamSchema, type CreateTeamInput } from '@/lib/validation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
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

export function CreateTeamForm() {
  const [state, formAction, isPending] = useActionState(
    createTeamAction,
    EMPTY_STATE,
  )

  // z.input, not z.infer: `timezone` has a .default(), which makes it optional
  // on the way in and required on the way out. The resolver validates input.
  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', timezone: DEFAULT_TIMEZONE },
  })

  const serverMessage = state.error ?? Object.values(state.fieldErrors ?? {})[0]

  function handleValid(values: CreateTeamInput) {
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
              <FormLabel>Team name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="organization"
                  placeholder="Kaizen Works"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  {TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormDescription>
                Decides when the team&rsquo;s day rolls over, and when the daily
                digest goes out.
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

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating team…' : 'Create team'}
        </Button>
      </form>
    </Form>
  )
}

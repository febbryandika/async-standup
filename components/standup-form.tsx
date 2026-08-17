'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'

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
  /**
   * SPEC §6.1's optimistic update. Called with the values the action is about to
   * receive, so `TodayPanel` can put the card in the feed before the round trip.
   */
  onOptimisticSave: (values: StandupInput) => void
}

export function StandupForm({ standup, onOptimisticSave }: StandupFormProps) {
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
    // One transition for both. useOptimistic holds its value until the
    // transition settles, and the transition does not settle until the action
    // has returned *and* the router tree its revalidatePath produced has been
    // applied — so the optimistic card is replaced by the real row in a single
    // commit, with no window where the feed shows neither. A failed write calls
    // no revalidatePath, the transition ends anyway, and the card simply reverts
    // to the server's last word while the Alert below explains why.
    startTransition(() => {
      onOptimisticSave(values)
      formAction(values)
    })
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

        {/* SPEC §6.2's "thumb-reachable": a grid item defaults to
            justify-self: stretch, so leaving it alone below `sm` gives a
            full-width button at the end of the form — which is where a thumb
            already is on a phone. */}
        <Button
          type="submit"
          disabled={isPending}
          className="sm:justify-self-start"
        >
          {/* SPEC §6.1 asks for disabled + a spinner. The label already changes,
              which is what a screen reader hears; the spinner is aria-hidden
              because announcing it too would just say the same thing twice. */}
          {isPending ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : null}
          {isPending ? 'Saving…' : 'Save standup'}
        </Button>
      </form>
    </Form>
  )
}

'use client'

import { startTransition, useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'

import { upsertStandupAction, type StandupState } from '@/actions/standups'
import { standupSchema, type StandupInput } from '@/lib/validation'
import { AvatarInitials } from '@/components/avatar-initials'
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
  /** For the composer's avatar only. */
  userName: string
  /**
   * SPEC §6.1's optimistic update. Called with the values the action is about to
   * receive, so `TodayPanel` can put the card in the feed before the round trip.
   */
  onOptimisticSave: (values: StandupInput) => void
}

export function StandupForm({
  standup,
  userName,
  onOptimisticSave,
}: StandupFormProps) {
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
        className="bg-card shadow-card overflow-hidden rounded-2xl border"
      >
        <div className="flex items-center gap-3 border-b px-5 py-3.5">
          <AvatarInitials name={userName} className="size-8" />
          <div className="flex min-w-0 flex-col">
            <span className="text-[0.95rem] leading-tight font-semibold">
              Your update
            </span>
            <span className="text-muted-foreground text-xs">
              {standup
                ? 'Editing rewrites today’s row — it is the same surface either way.'
                : 'Your first update — what did you work on yesterday?'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <FormField
            control={form.control}
            name="yesterday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yesterday</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} />
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
                  <Textarea rows={2} {...field} />
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
                {/* Always rendered, and third in the tab order. The design
                    collapses this behind an "Add a blocker" button; the field
                    that answers the one question the digest leads with is not
                    the field to hide behind a click. */}
                <FormLabel className="text-destructive!">Blockers</FormLabel>
                <FormControl>
                  {/* No tint on the field itself. The design draws a red box
                      because there it is opt-in — you clicked "Add a blocker".
                      Always-on, a red-outlined empty optional field reads as a
                      validation error. The label carries the meaning. */}
                  <Textarea rows={2} {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Optional. Anything holding you up — it leads the team&rsquo;s
                  digest.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-muted flex flex-wrap items-center gap-3 border-t px-5 py-3.5">
          {/* The wrapper always renders so the live region exists before it has
              anything to say. Clearing it while pending means a second save
              re-announces rather than repeating identical text into the void. */}
          <div aria-live="polite" className="min-w-0 flex-1">
            {isPending ? null : serverMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{serverMessage}</AlertDescription>
              </Alert>
            ) : state.saved ? (
              <p className="text-muted-foreground text-sm">Standup saved</p>
            ) : null}
          </div>

          {/* SPEC §6.2's "thumb-reachable": full width at the end of the form
              below `sm`, which is where a thumb already is on a phone. */}
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {/* SPEC §6.1 asks for disabled + a spinner. The label already
                changes, which is what a screen reader hears; the spinner is
                aria-hidden because announcing it too would say the same thing
                twice. */}
            {isPending ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : null}
            {isPending ? 'Saving…' : 'Save standup'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

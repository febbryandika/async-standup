'use client'

import { useState, useTransition } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'

import { regenerateInviteCodeAction } from '@/actions/teams'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const COPIED_RESET_MS = 2000

export function InviteCodeActions({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    // A timeout in the handler, not a useEffect: this is a consequence of the
    // click, not of the component rendering.
    setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateInviteCodeAction()
      // Closing here rather than in an effect keeps "the write finished" and
      // "the dialog closes" as one statement.
      setConfirmOpen(false)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="lg" onClick={handleCopy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : 'Copy code'}
      </Button>

      {/* Text, not just the icon swap above — the state change has to be
          announced, not only seen. */}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Invite code copied to clipboard' : ''}
      </span>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" size="lg">
            Regenerate
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate invite code?</DialogTitle>
            <DialogDescription>
              {code} stops working immediately. Anyone still holding it —
              including teammates who haven&rsquo;t joined yet — will need the
              new code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleRegenerate}
              disabled={isPending}
            >
              {isPending ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

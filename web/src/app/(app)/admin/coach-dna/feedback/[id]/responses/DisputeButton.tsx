'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { raiseDispute } from './actions'

export function DisputeButton({ feedbackResponseId }: { feedbackResponseId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [disputed, setDisputed] = useState(false)
  const [pending, startTransition] = useTransition()

  if (disputed) {
    return <p className="text-xs text-zinc-500">Dispute submitted — an admin will review it.</p>
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag size={14} /> Dispute this response
      </Button>
    )
  }

  function submit() {
    startTransition(async () => {
      const result = await raiseDispute(feedbackResponseId, reason)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Dispute submitted')
        setDisputed(true)
      }
    })
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Why are you disputing this response?"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending || !reason.trim()} onClick={submit}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Submit dispute
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

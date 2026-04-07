'use client'

import { useTransition } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { completeBlockSession } from '../actions'
import { toast } from 'sonner'

interface Props {
  blockSessionId: string
  groupId: string
  sessionNumber: number
}

export function CompleteSessionButton({ blockSessionId, groupId, sessionNumber }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleComplete() {
    if (!confirm(`Mark Session ${sessionNumber} as complete? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await completeBlockSession(blockSessionId, groupId)
      if (result?.error) toast.error(result.error)
      else toast.success(`Session ${sessionNumber} marked complete`)
    })
  }

  return (
    <button
      onClick={handleComplete}
      disabled={isPending}
      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
      Done
    </button>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteBlockSession } from '../actions'
import { toast } from 'sonner'

interface Props {
  blockSessionId: string
  groupId: string
  sessionNumber: number
}

export function DeleteSessionButton({ blockSessionId, groupId, sessionNumber }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBlockSession(blockSessionId, groupId)
      if (result?.error) {
        toast.error(result.error)
        setConfirming(false)
      }
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors"
        title="Delete session"
      >
        <Trash2 size={12} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-red-300">Delete session {sessionNumber}?</span>
      <button
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-1"
      >
        No
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
        Yes
      </button>
    </div>
  )
}

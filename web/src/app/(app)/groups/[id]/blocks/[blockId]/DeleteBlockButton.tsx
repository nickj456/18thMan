'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteCoachingBlock } from '../actions'
import { toast } from 'sonner'

interface Props {
  blockId: string
  groupId: string
  blockName: string
}

export function DeleteBlockButton({ blockId, groupId, blockName }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCoachingBlock(blockId, groupId)
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
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
      >
        <Trash2 size={13} /> Delete Block
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/5">
      <AlertTriangle size={14} className="text-red-400 shrink-0" />
      <p className="text-xs text-red-300 flex-1">
        Delete <span className="font-medium">{blockName}</span> and all its session plans?
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 size={12} className="animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  )
}

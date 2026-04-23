'use client'

import { useTransition, useState } from 'react'
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { deleteWellbeingResource, updateWellbeingSortOrder } from './actions'

interface WellbeingControlsProps {
  id: string
  isFirst: boolean
  isLast: boolean
}

export function WellbeingControls({ id, isFirst, isLast }: WellbeingControlsProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex items-center gap-1">
      {confirmDelete ? (
        <>
          <span className="text-xs text-zinc-500 mr-1">Delete?</span>
          <button
            onClick={() => startTransition(() => deleteWellbeingResource(id))}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            No
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => startTransition(() => updateWellbeingSortOrder(id, 'up'))}
            disabled={isPending || isFirst}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => startTransition(() => updateWellbeingSortOrder(id, 'down'))}
            disabled={isPending || isLast}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  )
}

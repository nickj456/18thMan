'use client'

import { useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePlayerNote } from '../actions'

export function DeleteNoteButton({
  groupId,
  playerId,
  noteId,
}: {
  groupId: string
  playerId: string
  noteId: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { await deletePlayerNote(groupId, playerId, noteId) })}
      disabled={isPending}
      className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Delete note"
    >
      {isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
    </button>
  )
}

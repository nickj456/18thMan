'use client'

import { useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePlayer } from '../actions'

export function DeletePlayerButton({
  groupId,
  playerId,
}: {
  groupId: string
  playerId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this player? This cannot be undone.')) return
    startTransition(async () => { await deletePlayer(groupId, playerId) })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 transition-colors disabled:opacity-50"
      title="Delete player"
    >
      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      Delete player
    </button>
  )
}

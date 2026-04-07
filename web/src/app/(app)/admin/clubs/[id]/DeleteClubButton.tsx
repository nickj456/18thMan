'use client'

import { useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteClub } from '../actions'
import { toast } from 'sonner'

interface Props {
  clubId: string
  clubName: string
}

export function DeleteClubButton({ clubId, clubName }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${clubName}"?\n\nThis will remove the club and clear all members. This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteClub(clubId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Delete Club
    </button>
  )
}

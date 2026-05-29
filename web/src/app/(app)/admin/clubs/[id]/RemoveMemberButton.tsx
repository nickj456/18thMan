'use client'

import { useTransition } from 'react'
import { UserMinus, Loader2 } from 'lucide-react'
import { removeUserFromClub } from '../actions'
import { toast } from 'sonner'

interface Props {
  clubId: string
  userId: string
}

export function RemoveMemberButton({ clubId, userId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm('Remove this user from the club?')) return
    startTransition(async () => {
      const result = await removeUserFromClub(clubId, userId)
      if (result?.error) toast.error(result.error)
      else toast.success('User removed from club')
    })
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Remove from club"
    >
      {isPending ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
      Remove
    </button>
  )
}

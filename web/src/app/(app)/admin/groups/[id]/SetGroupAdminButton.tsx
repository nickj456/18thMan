'use client'

import { useTransition } from 'react'
import { Shield, ShieldOff, Loader2 } from 'lucide-react'
import { setGroupAdmin, removeGroupAdmin } from '@/app/(app)/groups/actions'
import { toast } from 'sonner'

interface Props {
  groupId: string
  userId: string
  isAdmin: boolean
}

export function SetGroupAdminButton({ groupId, userId, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(isAdmin ? 'Remove group admin rights from this user?' : 'Make this user a group admin?')) return
    startTransition(async () => {
      const result = isAdmin ? await removeGroupAdmin(groupId, userId) : await setGroupAdmin(groupId, userId)
      if (result?.error) toast.error(result.error)
      else toast.success(isAdmin ? 'Admin rights removed' : 'Group admin set')
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
        isAdmin ? 'text-amber-500 hover:text-zinc-400' : 'text-zinc-600 hover:text-amber-400'
      }`}
      title={isAdmin ? 'Remove group admin' : 'Make group admin'}
    >
      {isPending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : isAdmin ? (
        <ShieldOff size={12} />
      ) : (
        <Shield size={12} />
      )}
      {isAdmin ? 'Unadmin' : 'Make admin'}
    </button>
  )
}

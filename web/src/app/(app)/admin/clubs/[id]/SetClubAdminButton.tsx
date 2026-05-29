'use client'

import { useTransition } from 'react'
import { Shield, ShieldOff, Loader2 } from 'lucide-react'
import { setClubAdmin, removeClubAdmin } from '../actions'
import { toast } from 'sonner'

interface Props {
  clubId: string
  userId: string
  isAdmin: boolean
}

export function SetClubAdminButton({ clubId, userId, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const action = isAdmin ? 'remove admin rights from' : 'make'
    if (!confirm(`${action === 'make' ? 'Make this user the club admin?' : 'Remove club admin rights from this user?'}`)) return

    startTransition(async () => {
      const result = isAdmin
        ? await removeClubAdmin(clubId, userId)
        : await setClubAdmin(clubId, userId)

      if (result?.error) toast.error(result.error)
      else toast.success(isAdmin ? 'Admin rights removed' : 'Club admin set')
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
        isAdmin
          ? 'text-amber-500 hover:text-zinc-400'
          : 'text-zinc-600 hover:text-amber-400'
      }`}
      title={isAdmin ? 'Remove club admin' : 'Make club admin'}
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

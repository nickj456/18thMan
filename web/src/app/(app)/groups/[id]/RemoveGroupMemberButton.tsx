'use client'

import { useTransition } from 'react'
import { UserMinus, Loader2 } from 'lucide-react'
import { removeUserFromGroup } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  userId: string
  isSelf?: boolean
}

export function RemoveGroupMemberButton({ groupId, userId, isSelf }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRemove() {
    const msg = isSelf ? 'Leave this group?' : 'Remove this member from the group?'
    if (!confirm(msg)) return
    startTransition(async () => {
      const result = await removeUserFromGroup(groupId, userId)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(isSelf ? 'You left the group' : 'Member removed')
        router.refresh()
        if (isSelf) router.push('/groups')
      }
    })
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
      title={isSelf ? 'Leave group' : 'Remove from group'}
    >
      {isPending ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
      {isSelf ? 'Leave' : 'Remove'}
    </button>
  )
}

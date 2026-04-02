'use client'

import { useTransition, useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { inviteUserToGroup } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  display_name: string | null
}

interface Props {
  groupId: string
  users: User[]
}

export function InviteGroupMemberForm({ groupId, users }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState('')
  const router = useRouter()

  function handleInvite() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await inviteUserToGroup(groupId, selectedId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Invitation sent'); setSelectedId(''); router.refresh() }
    })
  }

  return (
    <div className="flex gap-2">
      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="flex-1 text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">Select a club member…</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.display_name ?? u.username} (@{u.username})
          </option>
        ))}
      </select>
      <button
        onClick={handleInvite}
        disabled={!selectedId || isPending}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 transition-colors disabled:opacity-40"
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
        Invite
      </button>
    </div>
  )
}

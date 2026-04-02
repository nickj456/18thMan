'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { inviteUserToClub } from '../actions'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  display_name: string | null
}

interface Props {
  clubId: string
  users: User[]
}

export function InviteUserForm({ clubId, users }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleInvite() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await inviteUserToClub(clubId, selectedId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Invitation sent')
        setSelectedId('')
      }
    })
  }

  return (
    <div className="flex gap-2">
      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="flex-1 text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
      >
        <option value="">Select a user to invite…</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.display_name ?? u.username} (@{u.username})
          </option>
        ))}
      </select>
      <button
        onClick={handleInvite}
        disabled={!selectedId || isPending}
        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        Invite
      </button>
    </div>
  )
}

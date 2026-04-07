'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserMinus, Loader2, ChevronDown } from 'lucide-react'
import { clubAdminInviteUser, clubAdminRemoveMember } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  username: string
  display_name: string | null
  club_role: string | null
}

interface AvailableUser {
  id: string
  username: string
  display_name: string | null
}

interface Props {
  clubId: string
  members: Member[]
  availableUsers: AvailableUser[]
  currentUserId: string
}

export function ClubAdminPanel({ clubId, members, availableUsers, currentUserId }: Props) {
  const router = useRouter()
  const [inviteId, setInviteId] = useState('')
  const [invitePending, startInvite] = useTransition()
  const [removePending, startRemove] = useTransition()

  function handleInvite() {
    if (!inviteId) return
    startInvite(async () => {
      const result = await clubAdminInviteUser(clubId, inviteId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Invitation sent'); setInviteId(''); router.refresh() }
    })
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the club?`)) return
    startRemove(async () => {
      const result = await clubAdminRemoveMember(clubId, userId)
      if (result?.error) toast.error(result.error)
      else { toast.success(`${name} removed from club`); router.refresh() }
    })
  }

  return (
    <div className="space-y-6 border-t border-zinc-800 pt-6 mt-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Club Admin</h2>

      {/* Invite */}
      {availableUsers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Invite a coach to your club</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={inviteId}
                onChange={e => setInviteId(e.target.value)}
                className="w-full appearance-none text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 pr-8 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
              >
                <option value="">Select a coach to invite…</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.display_name ?? u.username} (@{u.username})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
            <button
              onClick={handleInvite}
              disabled={!inviteId || invitePending}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {invitePending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Invite
            </button>
          </div>
        </div>
      )}

      {/* Remove members */}
      {members.filter(m => m.id !== currentUserId).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Remove a member</p>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {members
                .filter(m => m.id !== currentUserId)
                .map(m => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm text-zinc-200">{m.display_name ?? m.username}</p>
                      <p className="text-xs text-zinc-600">@{m.username}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(m.id, m.display_name ?? m.username)}
                      disabled={removePending}
                      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {removePending ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                      Remove
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

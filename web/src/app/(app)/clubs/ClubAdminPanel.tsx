'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserMinus, Loader2, ChevronDown, Link2, RefreshCw, Check, Clock, X } from 'lucide-react'
import { clubAdminInviteUser, clubAdminRemoveMember, regenerateInviteToken, clubAdminCancelInvite } from './actions'
import { formatDistanceToNow } from 'date-fns'
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

interface PendingInvite {
  invitationId: string
  userId: string
  createdAt: string
  displayName: string | null
  username: string
}

interface Props {
  clubId: string
  inviteToken: string
  members: Member[]
  availableUsers: AvailableUser[]
  pendingInvites: PendingInvite[]
  currentUserId: string
}

export function ClubAdminPanel({ clubId, inviteToken, members, availableUsers, pendingInvites, currentUserId }: Props) {
  const router = useRouter()
  const [inviteId, setInviteId] = useState('')
  const [invitePending, startInvite] = useTransition()
  const [removePending, startRemove] = useTransition()
  const [regenPending, startRegen] = useTransition()
  const [cancelPending, startCancel] = useTransition()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [currentToken, setCurrentToken] = useState(inviteToken)

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${currentToken}`
    : `/join/${currentToken}`

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRegen() {
    if (!confirm('Regenerate invite link? The current link will stop working.')) return
    startRegen(async () => {
      const result = await regenerateInviteToken(clubId)
      if (result?.error) toast.error(result.error)
      else if (result?.token) {
        setCurrentToken(result.token)
        toast.success('Invite link regenerated')
      }
    })
  }

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

  function handleCancelInvite(invitationId: string, name: string) {
    setCancellingId(invitationId)
    startCancel(async () => {
      const result = await clubAdminCancelInvite(clubId, invitationId)
      if (result?.error) { toast.error(result.error); setCancellingId(null) }
      else { toast.success(`Invitation to ${name} cancelled`); router.refresh() }
    })
  }

  return (
    <div className="space-y-6 border-t border-zinc-800 pt-6 mt-6">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Club Admin</h2>

      {/* Invite link */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">Share this link with your coaching staff</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 min-w-0">
            <Link2 size={13} className="text-zinc-600 shrink-0" />
            <span className="text-xs text-zinc-400 truncate">/join/{currentToken}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Link2 size={13} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            onClick={handleRegen}
            disabled={regenPending}
            title="Regenerate link"
            className="flex items-center justify-center size-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={regenPending ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Invite by username */}
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

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Clock size={11} className="text-amber-400" />
            Pending invitations ({pendingInvites.length})
          </p>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {pendingInvites.map(inv => (
                <li key={inv.invitationId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-zinc-200">{inv.displayName ?? inv.username}</p>
                    <p className="text-xs text-zinc-600">
                      @{inv.username} · invited {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                      <Clock size={9} /> Pending
                    </span>
                    <button
                      onClick={() => handleCancelInvite(inv.invitationId, inv.displayName ?? inv.username)}
                      disabled={cancelPending && cancellingId === inv.invitationId}
                      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Cancel invitation"
                    >
                      {cancelPending && cancellingId === inv.invitationId
                        ? <Loader2 size={12} className="animate-spin" />
                        : <X size={12} />}
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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

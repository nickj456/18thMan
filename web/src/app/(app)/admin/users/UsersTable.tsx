'use client'

import { useState, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Check, X } from 'lucide-react'
import { UserRoleSelect } from './UserRoleSelect'
import { DeleteUserButton } from './DeleteUserButton'
import { updateAdminNote } from './actions'
import type { UserRole, SubscriptionTier } from '@/lib/supabase/types'

export type UserRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  role: string
  subscription_tier: string
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  created_at: string
  club_name: string | null
  last_seen: string | null
  admin_note: string
}

type SortCol = 'name' | 'tier' | 'joined' | 'last_seen' | 'role'
type SortDir = 'asc' | 'desc'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

const roleColour: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  coach: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  viewer: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
}

const tierColour: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  coach: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  club: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const tierLabel: Record<string, string> = {
  free: 'Free',
  trial: 'Free Trial',
  coach: 'Coach Pro',
  club: 'Club',
}

function TierBadge({
  tier,
  trialEndsAt,
  stripeSubscriptionId,
  clubName,
}: {
  tier: SubscriptionTier
  trialEndsAt: string | null
  stripeSubscriptionId: string | null
  clubName: string | null
}) {
  const isOnTrial = !clubName && trialEndsAt && new Date(trialEndsAt) > new Date()
  const effectiveKey = clubName ? 'club' : isOnTrial ? 'trial' : tier
  const colour = tierColour[effectiveKey] ?? tierColour.free
  const label = clubName ? `Club – ${clubName}` : tierLabel[effectiveKey] ?? tier
  const trialExpiry = isOnTrial
    ? new Date(trialEndsAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${colour}`}>
        {label}
      </span>
      {isOnTrial && <span className="text-xs text-amber-500/70">Expires {trialExpiry}</span>}
      {!isOnTrial && !clubName && stripeSubscriptionId && tier !== 'free' && (
        <span className="text-xs text-zinc-500">Stripe active</span>
      )}
      {!isOnTrial && !clubName && !stripeSubscriptionId && tier !== 'free' && (
        <span className="text-xs text-red-400/70">No Stripe sub</span>
      )}
    </div>
  )
}

function NoteCell({ userId, initialNote }: { userId: string; initialNote: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNote)
  const [saved, setSaved] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const startEdit = () => {
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const cancel = () => {
    setValue(saved)
    setEditing(false)
  }

  const save = useCallback(async () => {
    if (value.trim() === saved.trim()) { setEditing(false); return }
    setSaving(true)
    const res = await updateAdminNote(userId, value)
    setSaving(false)
    if (!res?.error) { setSaved(value.trim()); setEditing(false) }
  }, [userId, value, saved])

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
            if (e.key === 'Escape') cancel()
          }}
          rows={3}
          className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          placeholder="Add a note…"
        />
        <div className="flex gap-1">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 disabled:opacity-50"
          >
            <Check size={10} /> Save
          </button>
          <button
            onClick={cancel}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          >
            <X size={10} /> Cancel
          </button>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <button
        onClick={startEdit}
        className="group text-left max-w-[180px] text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Click to edit note"
      >
        <span className="line-clamp-2">{saved}</span>
        <Pencil size={10} className="inline ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />
      </button>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors flex items-center gap-1"
    >
      <Pencil size={10} /> Add note
    </button>
  )
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="text-zinc-700" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-400" />
    : <ChevronDown size={12} className="text-indigo-400" />
}

function tierSortKey(tier: string, clubName: string | null, trialEndsAt: string | null): number {
  if (clubName) return 3
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) return 2
  if (tier === 'coach') return 1
  return 0
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [sortCol, setSortCol] = useState<SortCol>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sorted = [...users].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'name') {
      const an = (a.display_name ?? a.username ?? '').toLowerCase()
      const bn = (b.display_name ?? b.username ?? '').toLowerCase()
      cmp = an.localeCompare(bn)
    } else if (sortCol === 'tier') {
      cmp = tierSortKey(a.subscription_tier, a.club_name, a.trial_ends_at)
           - tierSortKey(b.subscription_tier, b.club_name, b.trial_ends_at)
    } else if (sortCol === 'joined') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else if (sortCol === 'last_seen') {
      const at = a.last_seen ? new Date(a.last_seen).getTime() : 0
      const bt = b.last_seen ? new Date(b.last_seen).getTime() : 0
      cmp = at - bt
    } else if (sortCol === 'role') {
      const order = { admin: 0, coach: 1, viewer: 2 } as Record<string, number>
      cmp = (order[a.role] ?? 3) - (order[b.role] ?? 3)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const cols: { key: SortCol; label: string; align?: string }[] = [
    { key: 'name', label: 'User' },
    { key: 'tier', label: 'Tier' },
    { key: 'joined', label: 'Joined' },
    { key: 'last_seen', label: 'Last seen' },
    { key: 'role', label: 'Role', align: 'text-right' },
  ]

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              {cols.map(col => (
                <th
                  key={col.key}
                  className={`px-5 py-3 ${col.align ?? 'text-left'}`}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                      sortCol === col.key ? 'text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'
                    } ${col.align ?? ''}`}
                  >
                    {col.label}
                    <SortIcon col={col.key} active={sortCol === col.key} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                Club
              </th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                Notes
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900">
            {!sorted.length ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-600">No users found</td>
              </tr>
            ) : (
              sorted.map(profile => (
                <tr key={profile.id} className="hover:bg-zinc-800/40 transition-colors">
                  {/* User */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={profile.avatar_url ?? ''} />
                        <AvatarFallback className="text-xs bg-zinc-800">
                          {profile.display_name?.[0]?.toUpperCase() ?? profile.username?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-zinc-200">{profile.display_name ?? profile.username}</p>
                        <p className="text-xs text-zinc-600">@{profile.username}</p>
                      </div>
                    </div>
                  </td>
                  {/* Tier */}
                  <td className="px-5 py-3.5">
                    <TierBadge
                      tier={profile.subscription_tier as SubscriptionTier}
                      trialEndsAt={profile.trial_ends_at}
                      stripeSubscriptionId={profile.stripe_subscription_id}
                      clubName={profile.club_name}
                    />
                  </td>
                  {/* Joined */}
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">
                    {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  {/* Last seen */}
                  <td className="px-5 py-3.5 text-xs">
                    {(() => {
                      const t = timeAgo(profile.last_seen)
                      const isRecent = t === 'Just now' || t.endsWith('m ago') || t.endsWith('h ago')
                      return <span className={isRecent ? 'text-emerald-400' : 'text-zinc-600'}>{t}</span>
                    })()}
                  </td>
                  {/* Role */}
                  <td className="px-5 py-3.5 text-right">
                    <UserRoleSelect
                      userId={profile.id}
                      currentRole={profile.role as UserRole}
                      isSelf={profile.id === currentUserId}
                    />
                  </td>
                  {/* Club */}
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">
                    {profile.club_name ?? '—'}
                  </td>
                  {/* Notes */}
                  <td className="px-5 py-3.5">
                    <NoteCell userId={profile.id} initialNote={profile.admin_note} />
                  </td>
                  {/* Delete */}
                  <td className="px-3 py-3.5">
                    {profile.id !== currentUserId && (
                      <DeleteUserButton
                        userId={profile.id}
                        displayName={profile.display_name ?? profile.username ?? 'User'}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users2, UserPlus, Clock, XCircle } from 'lucide-react'
import { InviteGroupMemberForm } from './InviteGroupMemberForm'
import { RemoveGroupMemberButton } from './RemoveGroupMemberButton'

export const metadata = { title: 'Group — 18th Man' }

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id, created_by, created_at')
    .eq('id', id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  // Accepted members
  const { data: memberInvites } = await supabase
    .from('group_invitations')
    .select('id, user_id, profiles!group_invitations_user_id_fkey(id, username, display_name, avatar_url, role)')
    .eq('group_id', id)
    .eq('status', 'accepted')

  // Pending invitations
  const { data: pendingInvites } = await supabase
    .from('group_invitations')
    .select('id, user_id, profiles!group_invitations_user_id_fkey(id, username, display_name)')
    .eq('group_id', id)
    .eq('status', 'pending')

  const isMember = memberInvites?.some(m => m.user_id === user.id) ?? false
  const canManage = profile.role !== 'viewer' && (
    group.created_by === user.id || profile.role === 'admin'
  )

  // Club members not already in this group or pending
  const memberIds = (memberInvites ?? []).map(m => m.user_id)
  const pendingIds = (pendingInvites ?? []).map(p => p.user_id)
  const excludeIds = [...memberIds, ...pendingIds]

  let availableQuery = supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('club_id', profile.club_id)
    .order('display_name')

  if (excludeIds.length > 0) {
    availableQuery = availableQuery.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: availableUsers } = canManage ? await availableQuery : { data: [] }

  const statusBadge = (label: string) => (
    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
      <Clock size={9} /> {label}
    </span>
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Groups
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Users2 size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">{group.name}</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{memberInvites?.length ?? 0} members</p>
        </div>
      </div>

      {/* Invite */}
      {canManage && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={12} /> Invite a Member
          </h2>
          {(availableUsers?.length ?? 0) === 0 ? (
            <p className="text-sm text-zinc-600">All club members are already in this group or have a pending invite.</p>
          ) : (
            <InviteGroupMemberForm groupId={group.id} users={availableUsers ?? []} />
          )}
        </section>
      )}

      {/* Pending */}
      {(pendingInvites?.length ?? 0) > 0 && canManage && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Clock size={12} className="text-amber-400" /> Pending Invitations
          </h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {pendingInvites!.map(inv => {
                const p = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles
                const profile = p as { display_name: string | null; username: string } | null
                return (
                  <li key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm text-zinc-300">{profile?.display_name ?? profile?.username}</p>
                      <p className="text-xs text-zinc-600">@{profile?.username}</p>
                    </div>
                    {statusBadge('Pending')}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Members ({memberInvites?.length ?? 0})
        </h2>
        {!memberInvites?.length ? (
          <p className="text-sm text-zinc-600">No members yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {memberInvites.map(inv => {
                const p = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles
                const member = p as { id: string; display_name: string | null; username: string; role: string } | null
                const isSelf = inv.user_id === user.id
                return (
                  <li key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">
                        {member?.display_name ?? member?.username}
                        {isSelf && <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">You</span>}
                      </p>
                      <p className="text-xs text-zinc-600">@{member?.username}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-600 capitalize">{member?.role}</span>
                      {(canManage || isSelf) && (
                        <RemoveGroupMemberButton
                          groupId={group.id}
                          userId={inv.user_id}
                          isSelf={isSelf}
                        />
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Leave group (if member but not creator) */}
      {isMember && group.created_by !== user.id && (
        <div className="pt-2">
          <RemoveGroupMemberButton groupId={group.id} userId={user.id} isSelf />
        </div>
      )}
    </div>
  )
}

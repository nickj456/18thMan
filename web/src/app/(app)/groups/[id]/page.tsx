import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users2, UserPlus, Clock, XCircle, CalendarDays, Plus, Sparkles } from 'lucide-react'
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
    .select('role, club_role, club_id')
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

  // Group sessions
  const { data: sessions } = await supabase
    .from('session_plans')
    .select('id, title, total_duration, scheduled_at, created_at, drills_order')
    .eq('group_id', id)
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  const isMember = memberInvites?.some(m => m.user_id === user.id) ?? false
  const canManage = profile.club_role === 'admin' || profile.role === 'admin'

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

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Users2 size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">{group.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{memberInvites?.length ?? 0} members</p>
          </div>
        </div>
        {isMember && (
          <Link
            href={`/groups/${group.id}/ai-guidance`}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors"
          >
            <Sparkles size={14} /> AI Guidance
          </Link>
        )}
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

      {/* Sessions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays size={12} className="text-indigo-400" /> Sessions ({sessions?.length ?? 0})
          </h2>
          {isMember && profile.role !== 'viewer' && (
            <Link
              href={`/sessions/new?group=${group.id}`}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={12} /> New session
            </Link>
          )}
        </div>
        {!sessions?.length ? (
          <div className="flex flex-col items-center gap-2 py-10 rounded-xl border border-zinc-800 text-center">
            <CalendarDays size={24} className="text-zinc-700" />
            <p className="text-sm text-zinc-600">No sessions yet.</p>
            {isMember && profile.role !== 'viewer' && (
              <Link href={`/sessions/new?group=${group.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Create the first session →
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {sessions.map(s => {
                const drillCount = Array.isArray(s.drills_order) ? s.drills_order.length : 0
                const hours = s.total_duration ? Math.floor(s.total_duration / 60) : 0
                const mins = s.total_duration ? s.total_duration % 60 : 0
                const dur = s.total_duration ? (hours > 0 ? `${hours}h ${mins}min` : `${mins}min`) : null
                const scheduled = s.scheduled_at
                  ? new Date(s.scheduled_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : null
                return (
                  <li key={s.id}>
                    <Link href={`/sessions/${s.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/40 transition-colors">
                      <div>
                        <p className="text-sm text-zinc-200 font-medium">{s.title}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {drillCount} drill{drillCount !== 1 ? 's' : ''}{dur ? ` · ${dur}` : ''}
                        </p>
                      </div>
                      {scheduled && (
                        <span className="text-xs text-amber-400 flex items-center gap-1 shrink-0">
                          <CalendarDays size={11} /> {scheduled}
                        </span>
                      )}
                    </Link>
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

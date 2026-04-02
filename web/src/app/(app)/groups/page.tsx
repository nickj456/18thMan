import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users2, Plus, Clock, ArrowRight, Building2 } from 'lucide-react'
import { GroupAcceptDeclineButtons } from './GroupAcceptDeclineButtons'

export const metadata = { title: 'My Groups — 18th Man' }

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .single()

  // No club yet — prompt to join one first
  if (!profile?.club_id) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">My Groups</h1>
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Building2 size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">You need to be a member of a club before joining groups.</p>
          <Link href="/clubs" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Go to My Club →
          </Link>
        </div>
      </div>
    )
  }

  // My accepted groups
  const { data: myGroupInvites } = await supabase
    .from('group_invitations')
    .select('id, group_id, coaching_groups(id, name, club_id, created_at)')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })

  // Pending group invitations
  const { data: pendingInvites } = await supabase
    .from('group_invitations')
    .select('id, group_id, coaching_groups(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const myGroups = (myGroupInvites ?? []).map(inv => {
    const g = Array.isArray(inv.coaching_groups) ? inv.coaching_groups[0] : inv.coaching_groups
    return g as { id: string; name: string; created_at: string } | null
  }).filter(Boolean)

  const canCreate = profile.role !== 'viewer'

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Users2 size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">My Groups</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{myGroups.length} group{myGroups.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canCreate && (
          <Link
            href="/groups/new"
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
          >
            <Plus size={14} /> New Group
          </Link>
        )}
      </div>

      {/* Pending invitations */}
      {(pendingInvites?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            <Clock size={12} className="text-amber-400" /> Pending Invitations
          </div>
          {pendingInvites!.map(inv => {
            const g = Array.isArray(inv.coaching_groups) ? inv.coaching_groups[0] : inv.coaching_groups
            const group = g as { id: string; name: string } | null
            return (
              <div key={inv.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Users2 size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{group?.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">You&apos;ve been invited to join this group</p>
                  </div>
                </div>
                <GroupAcceptDeclineButtons invitationId={inv.id} />
              </div>
            )
          })}
        </section>
      )}

      {/* My groups */}
      {myGroups.length === 0 && (pendingInvites?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Users2 size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">You&apos;re not in any groups yet.</p>
          {canCreate && (
            <p className="text-xs text-zinc-600">Create a group or wait to be invited by a coach.</p>
          )}
        </div>
      ) : myGroups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your Groups</h2>
          <div className="space-y-2">
            {myGroups.map(group => (
              <Link
                key={group!.id}
                href={`/groups/${group!.id}`}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Users2 size={16} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-200">{group!.name}</p>
                </div>
                <ArrowRight size={14} className="text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

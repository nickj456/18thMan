import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users2, UserPlus, Shield, CheckCircle } from 'lucide-react'
import { AddGroupMemberForm } from './AddGroupMemberForm'
import { SetGroupAdminButton } from './SetGroupAdminButton'
import { RemoveGroupMemberButton } from '@/app/(app)/groups/[id]/RemoveGroupMemberButton'
import { DeleteGroupButton } from './DeleteGroupButton'

export const metadata = { title: 'Manage Group — Admin' }

export default async function AdminGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id, created_at')
    .eq('id', id)
    .single()

  if (!group) redirect('/admin/clubs')

  const { data: members } = await supabase
    .from('group_invitations')
    .select('id, user_id, group_role, profiles!group_invitations_user_id_fkey(id, username, display_name)')
    .eq('group_id', id)
    .eq('status', 'accepted')
    .order('created_at' as never)

  const memberIds = (members ?? []).map(m => m.user_id)

  let availableQuery = supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('club_id', group.club_id)
    .order('display_name')

  if (memberIds.length > 0) {
    availableQuery = availableQuery.not('id', 'in', `(${memberIds.join(',')})`)
  }

  const { data: availableUsers } = await availableQuery

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href={`/admin/clubs/${group.club_id}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Club
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Users2 size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">{group.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{members?.length ?? 0} members</p>
          </div>
        </div>
        <DeleteGroupButton groupId={group.id} groupName={group.name} />
      </div>

      {/* Add member */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <UserPlus size={12} /> Add a Member
        </h2>
        {(availableUsers?.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-600">All club members are already in this group.</p>
        ) : (
          <AddGroupMemberForm groupId={group.id} users={availableUsers ?? []} />
        )}
      </section>

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <CheckCircle size={12} className="text-emerald-400" /> Members ({members?.length ?? 0})
        </h2>
        {!members?.length ? (
          <p className="text-sm text-zinc-600">No members yet — add some above.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                {members.map(inv => {
                  const p = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles
                  const member = p as { id: string; display_name: string | null; username: string } | null
                  const isGroupAdmin = inv.group_role === 'admin'
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-zinc-200 font-medium">{member?.display_name ?? member?.username}</p>
                            <p className="text-xs text-zinc-600">@{member?.username}</p>
                          </div>
                          {isGroupAdmin && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                              <Shield size={9} /> Group Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <SetGroupAdminButton
                            groupId={group.id}
                            userId={inv.user_id}
                            isAdmin={isGroupAdmin}
                          />
                          <RemoveGroupMemberButton groupId={group.id} userId={inv.user_id} isSelf={false} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

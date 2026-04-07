import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2, UserPlus, Clock, CheckCircle, XCircle, Shield, Settings } from 'lucide-react'
import { updateClubSettings } from '../actions'
import { InviteUserForm } from './InviteUserForm'
import { RemoveMemberButton } from './RemoveMemberButton'
import { SetClubAdminButton } from './SetClubAdminButton'

export const metadata = { title: 'Manage Club — Admin' }

export default async function AdminClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, slug, max_members, created_at')
    .eq('id', id)
    .single()

  if (!club) redirect('/admin/clubs')

  const { data: members } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, club_role, created_at')
    .eq('club_id', id)
    .order('created_at')

  const { data: invitations } = await supabase
    .from('club_invitations')
    .select('id, user_id, status, created_at, profiles!club_invitations_user_id_fkey(id, username, display_name)')
    .eq('club_id', id)
    .neq('status', 'accepted')
    .order('created_at', { ascending: false })

  const pendingUserIds = (invitations ?? [])
    .filter(i => i.status === 'pending')
    .map(i => i.user_id)

  const memberIds = (members ?? []).map(m => m.id)
  const excludeIds = [...memberIds, ...pendingUserIds]

  let availableQuery = supabase
    .from('profiles')
    .select('id, username, display_name')
    .is('club_id', null)
    .order('display_name')

  if (excludeIds.length > 0) {
    availableQuery = availableQuery.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: availableUsers } = await availableQuery

  const clubAdminId = members?.find(m => m.club_role === 'admin')?.id

  const statusBadge = (status: string) => {
    if (status === 'pending') return <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full"><Clock size={9} /> Pending</span>
    if (status === 'declined') return <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full"><XCircle size={9} /> Declined</span>
    return null
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/admin/clubs" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Clubs
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">{club.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{club.slug}</p>
          </div>
        </div>
      </div>

      {/* Club settings */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Settings size={12} /> Settings
        </h2>
        <form
          action={async (fd: FormData) => {
            'use server'
            await updateClubSettings(id, fd)
          }}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-medium text-zinc-400">Club Name</label>
              <input
                id="name"
                name="name"
                required
                defaultValue={club.name}
                className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="max_members" className="block text-xs font-medium text-zinc-400">
                Max Members <span className="text-zinc-600 font-normal">(blank = unlimited)</span>
              </label>
              <input
                id="max_members"
                name="max_members"
                type="number"
                min={1}
                defaultValue={club.max_members ?? ''}
                placeholder="Unlimited"
                className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {members?.length ?? 0} current member{members?.length !== 1 ? 's' : ''}
              {club.max_members ? ` · limit ${club.max_members}` : ' · no limit'}
            </p>
            <button
              type="submit"
              className="text-sm px-4 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      {/* Invite user */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <UserPlus size={12} /> Invite a User
        </h2>
        {(availableUsers?.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-600">All users are already in a club or have a pending invite.</p>
        ) : (
          <InviteUserForm clubId={club.id} users={availableUsers ?? []} />
        )}
      </section>

      {/* Pending / declined invitations */}
      {(invitations?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Invitations</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                {invitations!.map(inv => {
                  const profile = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles
                  return (
                    <tr key={inv.id}>
                      <td className="px-5 py-3.5">
                        <p className="text-zinc-300 text-sm">{(profile as { display_name: string | null; username: string })?.display_name ?? (profile as { username: string })?.username}</p>
                        <p className="text-xs text-zinc-600">@{(profile as { username: string })?.username}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">{statusBadge(inv.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <CheckCircle size={12} className="text-emerald-400" /> Members ({members?.length ?? 0})
        </h2>
        {!clubAdminId && (members?.length ?? 0) > 0 && (
          <p className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2">
            No club admin designated — use the &ldquo;Make admin&rdquo; button below to assign one.
          </p>
        )}
        {!members?.length ? (
          <p className="text-sm text-zinc-600">No members yet — invite some users above.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-zinc-200 font-medium">{m.display_name ?? m.username}</p>
                          <p className="text-xs text-zinc-600">@{m.username}</p>
                        </div>
                        {m.club_role === 'admin' && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                            <Shield size={9} /> Club Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <SetClubAdminButton
                          clubId={club.id}
                          userId={m.id}
                          isAdmin={m.club_role === 'admin'}
                        />
                        <RemoveMemberButton clubId={club.id} userId={m.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

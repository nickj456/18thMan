import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building2, Users, CheckCircle, Clock, Shield } from 'lucide-react'
import { AcceptDeclineButtons } from './AcceptDeclineButtons'
import { ClubAdminPanel } from './ClubAdminPanel'

export const metadata = { title: 'My Club — 18th Man' }
export const dynamic = 'force-dynamic'

export default async function ClubPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string }>
}) {
  const { joined } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, club_id, club_role')
    .eq('id', user.id)
    .single()

  // ── Member of a club ──────────────────────────────────────────────────────
  if (profile?.club_id) {
    const [{ data: club }, { data: members }] = await Promise.all([
      supabase
        .from('clubs')
        .select('id, name, slug, created_at, invite_token')
        .eq('id', profile.club_id)
        .single(),
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, club_role')
        .eq('club_id', profile.club_id)
        .order('display_name'),
    ])

    // Club admin needs the list of users not yet in a club to invite
    let availableUsers: { id: string; username: string; display_name: string | null }[] = []
    let pendingInvites: { invitationId: string; userId: string; createdAt: string; displayName: string | null; username: string }[] = []
    if (profile.club_role === 'admin') {
      const memberIds = (members ?? []).map(m => m.id)
      let q = supabase
        .from('profiles')
        .select('id, username, display_name')
        .is('club_id', null)
        .order('display_name')

      // Fetch pending invitations with user details for the admin panel
      const { data: pendingInvitations } = await supabase
        .from('club_invitations')
        .select('id, user_id, created_at, profiles!club_invitations_user_id_fkey(display_name, username)')
        .eq('club_id', profile.club_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      pendingInvites = (pendingInvitations ?? []).map(inv => ({
        invitationId: inv.id,
        userId: inv.user_id,
        createdAt: inv.created_at as string,
        displayName: (inv.profiles as unknown as { display_name: string | null; username: string | null } | null)?.display_name ?? null,
        username: (inv.profiles as unknown as { display_name: string | null; username: string | null } | null)?.username ?? '',
      }))

      const excludeIds = [...memberIds, ...pendingInvites.map(p => p.userId)]
      if (excludeIds.length > 0) {
        q = q.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data } = await q
      availableUsers = data ?? []
    }

    return (
      <div className="space-y-8 max-w-2xl">
        {joined && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-300">
            <CheckCircle size={16} className="shrink-0" />
            <p>You&apos;ve joined the club!</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Building2 size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">{club?.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
              <CheckCircle size={11} className="text-emerald-400" />
              {profile.club_role === 'admin' ? (
                <span className="flex items-center gap-1">
                  <Shield size={11} className="text-amber-400" /> Club Admin
                </span>
              ) : (
                'Member'
              )}
            </p>
          </div>
        </div>

        {/* Members list */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Users size={12} /> Members ({members?.length ?? 0})
          </h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {members?.map(m => (
                <li key={m.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm text-zinc-200 font-medium">{m.display_name ?? m.username}</p>
                    <p className="text-xs text-zinc-600">@{m.username}</p>
                  </div>
                  {m.club_role === 'admin' && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                      <Shield size={9} /> Admin
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Club admin management panel */}
        {profile.club_role === 'admin' && club?.invite_token && (
          <ClubAdminPanel
            clubId={profile.club_id}
            inviteToken={club.invite_token}
            members={members ?? []}
            availableUsers={availableUsers}
            pendingInvites={pendingInvites}
            currentUserId={user.id}
          />
        )}
      </div>
    )
  }

  // ── No club — check for pending invitations ───────────────────────────────
  const { data: invitations } = await supabase
    .from('club_invitations')
    .select('id, club_id, status, created_at, clubs(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (!invitations?.length) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">My Club</h1>
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Building2 size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">You&apos;re not a member of any club yet.</p>
          <p className="text-xs text-zinc-600">Ask your club admin to share their invite link with you.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="app-heading text-2xl">My Club</h1>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          <Clock size={12} className="text-amber-400" /> Pending Invitations
        </div>
        {invitations.map(inv => {
          const club = Array.isArray(inv.clubs) ? inv.clubs[0] : inv.clubs
          return (
            <div key={inv.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{(club as { name: string })?.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">You&apos;ve been invited to join this club</p>
                </div>
              </div>
              <AcceptDeclineButtons invitationId={inv.id} clubId={inv.club_id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

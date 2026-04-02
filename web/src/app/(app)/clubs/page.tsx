import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Building2, Users, CheckCircle, Clock } from 'lucide-react'
import { AcceptDeclineButtons } from './AcceptDeclineButtons'

export const metadata = { title: 'My Club — 18th Man' }

export default async function ClubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, club_id')
    .eq('id', user.id)
    .single()

  // If already in a club — show club details and members
  if (profile?.club_id) {
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name, slug, created_at')
      .eq('id', profile.club_id)
      .single()

    const { data: members } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, role')
      .eq('club_id', profile.club_id)
      .order('display_name')

    return (
      <div className="space-y-8 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Building2 size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">{club?.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
              <CheckCircle size={11} className="text-emerald-400" /> You&apos;re a member
            </p>
          </div>
        </div>

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
                  <span className="text-xs text-zinc-600 capitalize">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    )
  }

  // No club — check for pending invitations
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
          <p className="text-sm text-zinc-500">You haven&apos;t been assigned to a club yet.</p>
          <p className="text-xs text-zinc-600">Ask an admin to invite you to a club.</p>
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

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2, Plus, Users, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Clubs — Admin' }

export default async function AdminClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, slug, max_members, created_at')
    .order('created_at', { ascending: false })

  // Get member counts per club
  const { data: members } = await supabase
    .from('profiles')
    .select('club_id')
    .not('club_id', 'is', null)

  const memberCounts: Record<string, number> = {}
  for (const m of members ?? []) {
    if (m.club_id) memberCounts[m.club_id] = (memberCounts[m.club_id] ?? 0) + 1
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Admin Panel
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl flex items-center gap-2">
            <Building2 size={20} className="text-amber-400" /> Clubs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{clubs?.length ?? 0} clubs on the platform</p>
        </div>
        <Link
          href="/admin/clubs/new"
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white font-medium transition-colors"
        >
          <Plus size={14} /> New Club
        </Link>
      </div>

      {!clubs?.length ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Building2 size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No clubs yet. Create the first one.</p>
          <Link href="/admin/clubs/new" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
            Create a club →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Club</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Members</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900">
              {clubs.map(club => (
                <tr key={club.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-zinc-200">{club.name}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{club.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                      <Users size={12} />
                      {memberCounts[club.id] ?? 0}
                      {club.max_members ? <span className="text-zinc-600">/ {club.max_members}</span> : null}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">
                    {new Date(club.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/clubs/${club.id}`}
                      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Manage <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

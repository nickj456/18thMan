import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users } from 'lucide-react'
import { UserRoleSelect } from './UserRoleSelect'
import type { UserRole } from '@/lib/supabase/types'

export const metadata = { title: 'User Management — Admin' }

const roleColour: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  coach: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  viewer: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>
}) {
  const { q, role: roleFilter } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, club, club_id, role, created_at, clubs(name)')
    .order('created_at', { ascending: false })

  if (roleFilter && ['admin', 'coach', 'viewer'].includes(roleFilter)) {
    query = query.eq('role', roleFilter)
  }
  if (q) {
    query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
  }

  const { data: profiles } = await query

  const counts = {
    all: profiles?.length ?? 0,
    admin: profiles?.filter(p => p.role === 'admin').length ?? 0,
    coach: profiles?.filter(p => p.role === 'coach').length ?? 0,
    viewer: profiles?.filter(p => p.role === 'viewer').length ?? 0,
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Admin Panel
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="app-heading text-2xl flex items-center gap-2">
            <Users size={20} className="text-indigo-400" /> User Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{counts.all} users total</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or username…"
          className="text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
        />
        <div className="flex gap-1">
          {(['', 'admin', 'coach', 'viewer'] as const).map(r => (
            <Link
              key={r || 'all'}
              href={`/admin/users${r ? `?role=${r}` : ''}${q ? `${r ? '&' : '?'}q=${q}` : ''}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                (roleFilter ?? '') === r
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {r || 'All'} {r === '' ? `(${counts.all})` : r === 'admin' ? `(${counts.admin})` : r === 'coach' ? `(${counts.coach})` : `(${counts.viewer})`}
            </Link>
          ))}
        </div>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">User</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Club</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Joined</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900">
              {!profiles?.length ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-600">
                    No users found
                  </td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-zinc-800/40 transition-colors">
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
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">
                      {(profile as unknown as { clubs?: { name: string } | null }).clubs?.name ?? profile.club ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">
                      {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <UserRoleSelect
                        userId={profile.id}
                        currentRole={profile.role as UserRole}
                        isSelf={profile.id === user.id}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

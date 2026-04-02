import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users2 } from 'lucide-react'
import { createGroup } from '../actions'

export const metadata = { title: 'New Group — 18th Man' }

export default async function NewGroupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')
  if (profile.role === 'viewer') redirect('/groups')

  // Check group count
  const { count } = await supabase
    .from('coaching_groups')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', profile.club_id)

  const atLimit = (count ?? 0) >= 5

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Groups
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Users2 size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">New Group</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Create a coaching group within your club</p>
        </div>
      </div>

      {atLimit ? (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-300">
          Your club has reached the maximum of 5 groups. Delete an existing group to create a new one.
        </div>
      ) : (
        <form action={async (fd: FormData) => { 'use server'; await createGroup(fd) }} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-xs font-medium text-zinc-400">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              autoFocus
              placeholder="e.g. Forwards Unit, Attack Coaches"
              className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Create Group
          </button>
        </form>
      )}
    </div>
  )
}

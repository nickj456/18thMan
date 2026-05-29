import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2 } from 'lucide-react'
import { createClub } from '../actions'

export const metadata = { title: 'New Club — Admin' }

export default async function NewClubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-lg space-y-6">
      <Link href="/admin/clubs" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Clubs
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Building2 size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">New Club</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Create a club and then invite members</p>
        </div>
      </div>

      <form action={async (fd: FormData) => { 'use server'; await createClub(fd) }} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-medium text-zinc-400">
            Club Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="e.g. Wigan Warriors U16s"
            className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="max_members" className="block text-xs font-medium text-zinc-400">
            Max Members <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <input
            id="max_members"
            name="max_members"
            type="number"
            min={1}
            placeholder="Unlimited"
            className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
          />
          <p className="text-xs text-zinc-600">Leave blank for no limit</p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white text-sm font-medium transition-colors"
        >
          Create Club
        </button>
      </form>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressionClient } from './ProgressionClient'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

export const metadata = { title: 'Match Analysis — 18th Man' }

export default async function MatchProgressionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')
  if (!profile?.role || !['coach', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*, analyst:profiles!analyst_id(display_name)')
    .eq('club_id', profile.club_id)
    .order('match_date', { ascending: true }) as {
      data: MatchSessionWithAnalyst[] | null
    }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3 pb-6 border-b border-zinc-800">
        <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
          <TrendingUp size={18} className="text-[#e8560a]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Analysis</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Team progression and player report cards across uploaded sessions
          </p>
        </div>
      </div>

      {!sessions?.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <TrendingUp size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No match sessions uploaded yet.</p>
          <p className="text-xs text-zinc-600 max-w-xs">
            Upload sessions from the 18th Man Analyst app to start tracking team progression.
          </p>
        </div>
      ) : (
        <Suspense fallback={<div className="py-20 text-center text-sm text-zinc-600">Loading…</div>}>
          <ProgressionClient sessions={sessions} />
        </Suspense>
      )}
    </div>
  )
}

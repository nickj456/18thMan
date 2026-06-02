import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProgressionClient } from './ProgressionClient'
import type { MatchSessionWithAnalyst, ProgressionInsight } from '@/lib/supabase/types'

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

  const { data: clubData } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', profile.club_id)
    .single()

  const [sessionsResult, insightsResult] = await Promise.all([
    supabase
      .from('match_sessions')
      .select('*, analyst:profiles!analyst_id(display_name)')
      .eq('club_id', profile.club_id)
      .order('match_date', { ascending: true }) as unknown as Promise<{ data: MatchSessionWithAnalyst[] | null }>,
    supabase
      .from('progression_insights')
      .select('*')
      .eq('club_id', profile.club_id) as unknown as Promise<{ data: ProgressionInsight[] | null }>,
  ])

  const sessions = sessionsResult.data ?? []
  const savedInsights = insightsResult.data ?? []

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center text-2xl">📈</div>
        <p className="text-sm text-zinc-500 font-medium">No match sessions uploaded yet</p>
        <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
          Upload sessions from the 18th Man Analyst app to start tracking team progression.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-zinc-600">Loading…</div>}>
      <ProgressionClient
        sessions={sessions}
        savedInsights={savedInsights}
        clubName={clubData?.name ?? 'Your Club'}
      />
    </Suspense>
  )
}

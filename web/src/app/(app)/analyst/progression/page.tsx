import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProgressionClient } from './ProgressionClient'
import type { MatchSessionWithAnalyst, ProgressionInsight } from '@/lib/supabase/types'

export const metadata = { title: 'Match Analysis — 18th Man' }

interface Props {
  searchParams: Promise<{ group?: string }>
}

export default async function MatchProgressionPage({ searchParams }: Props) {
  const { group: groupParam } = await searchParams

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

  // Fetch groups the user belongs to (creator or accepted member)
  const { data: ownedGroups } = await supabase
    .from('coaching_groups')
    .select('id, name')
    .eq('club_id', profile.club_id)
    .eq('created_by', user.id)

  const { data: memberGroups } = await supabase
    .from('group_invitations')
    .select('group_id, coaching_groups!inner(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'accepted') as unknown as {
      data: { group_id: string; coaching_groups: { id: string; name: string } }[] | null
    }

  const allGroups = [
    ...(ownedGroups ?? []),
    ...(memberGroups ?? []).map(m => m.coaching_groups),
  ].filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i)

  if (!allGroups.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center text-2xl">📈</div>
        <p className="text-sm text-zinc-500 font-medium">No coaching groups found</p>
        <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
          You need to be a member of a coaching group to access match analysis.
        </p>
      </div>
    )
  }

  // Use URL param or default to first group
  const selectedGroupId = groupParam && allGroups.some(g => g.id === groupParam)
    ? groupParam
    : allGroups[0].id
  const selectedGroup = allGroups.find(g => g.id === selectedGroupId)!

  const { data: clubData } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', profile.club_id)
    .single()

  const [sessionsResult, insightsResult] = await Promise.all([
    supabase
      .from('match_sessions')
      .select('*, analyst:profiles!analyst_id(display_name)')
      .eq('group_id', selectedGroupId)
      .order('match_date', { ascending: true }) as unknown as Promise<{ data: MatchSessionWithAnalyst[] | null }>,
    supabase
      .from('progression_insights')
      .select('*')
      .eq('group_id', selectedGroupId) as unknown as Promise<{ data: ProgressionInsight[] | null }>,
  ])

  const sessions = sessionsResult.data ?? []
  const savedInsights = insightsResult.data ?? []

  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-zinc-600">Loading…</div>}>
      <ProgressionClient
        sessions={sessions}
        savedInsights={savedInsights}
        clubName={clubData?.name ?? 'Your Club'}
        groupId={selectedGroupId}
        groupName={selectedGroup.name}
        allGroups={allGroups}
      />
    </Suspense>
  )
}

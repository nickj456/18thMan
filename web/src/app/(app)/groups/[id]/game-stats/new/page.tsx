import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CreateSessionForm } from './CreateSessionForm'
import type { Match } from '@/lib/supabase/types'

export const metadata = { title: 'New Game Stats — 18th Man' }

export default async function NewGameStatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')
  if (!['coach', 'admin'].includes(profile.role)) redirect(`/groups/${id}/game-stats`)

  // Check paid tier
  const { data: tierData } = await supabase.rpc('effective_tier', { p_user_id: user.id })
  if (!['club', 'trial'].includes(tierData as string)) {
    redirect(`/groups/${id}/game-stats?upgrade=1`)
  }

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  // Matches for this group that don't already have a stats session
  const { data: existingSessionMatchIds } = await supabase
    .from('game_stat_sessions')
    .select('match_id')
    .eq('group_id', id)

  const usedMatchIds = (existingSessionMatchIds ?? []).map(s => s.match_id)

  let matchQuery = supabase
    .from('matches')
    .select('id, opponent, match_date, location')
    .eq('group_id', id)
    .order('match_date', { ascending: false })

  if (usedMatchIds.length > 0) {
    matchQuery = matchQuery.not('id', 'in', `(${usedMatchIds.join(',')})`)
  }

  const { data: matches } = await matchQuery as {
    data: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>[] | null
  }

  return (
    <div className="space-y-8 max-w-lg">
      <Link
        href={`/groups/${id}/game-stats`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Game Stats
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
          <Activity size={18} className="text-[#e8560a]" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">New Game Stats</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{group.name}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <p className="text-sm text-zinc-400">
          Select a match to begin tracking. Players will be loaded automatically from your squad.
        </p>
        <CreateSessionForm groupId={id} matches={matches ?? []} />
      </div>
    </div>
  )
}

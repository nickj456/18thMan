import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameStatsClient } from './GameStatsClient'
import type { GameStatSessionWithMatch, GameStatEvent } from '@/lib/supabase/types'
import type { Player } from '@/lib/supabase/types'

export const metadata = { title: 'Game Stats — 18th Man' }

export default async function GameStatsSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: session } = await supabase
    .from('game_stat_sessions')
    .select('id, group_id, match_id, created_by, created_at, match:matches(id, opponent, match_date, location)')
    .eq('id', sessionId)
    .single() as { data: GameStatSessionWithMatch | null }

  if (!session) redirect(`/groups/${id}/game-stats`)

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('club_id')
    .eq('id', session.group_id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .eq('group_id', session.group_id)
    .order('name') as { data: Pick<Player, 'id' | 'name'>[] | null }

  const { data: events } = await supabase
    .from('game_stat_events')
    .select('id, session_id, player_id, stat_type, half, completed, created_by, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true }) as { data: GameStatEvent[] | null }

  const canTap = ['coach', 'admin'].includes(profile.role)

  return (
    <GameStatsClient
      session={session}
      players={players ?? []}
      initialEvents={events ?? []}
      currentUserId={user.id}
      groupId={id}
      canTap={canTap}
    />
  )
}

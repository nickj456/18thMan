'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createMatch(
  groupId: string,
  opponent: string,
  matchDate: string,
  location: 'home' | 'away',
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['coach', 'admin'].includes(profile.role)) {
    return { error: 'Forbidden' }
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({ group_id: groupId, created_by: user.id, opponent, match_date: matchDate, location })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/game-stats/new`)
  return { id: data.id }
}

export async function createSession(
  groupId: string,
  matchId: string,
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify matchId belongs to this group (prevents cross-group linking)
  const { data: matchCheck } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .eq('group_id', groupId)
    .single()

  if (!matchCheck) return { error: 'Match not found in this group.' }

  const { data: session, error } = await supabase
    .from('game_stat_sessions')
    .insert({ group_id: groupId, match_id: matchId, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/groups/${groupId}/game-stats/${session.id}`)
}

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createSession(
  groupId: string,
  matchId: string,
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session, error } = await supabase
    .from('game_stat_sessions')
    .insert({ group_id: groupId, match_id: matchId, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/groups/${groupId}/game-stats/${session.id}`)
}

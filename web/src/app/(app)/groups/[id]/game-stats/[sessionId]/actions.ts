'use server'

import { createClient } from '@/lib/supabase/server'
import type { StatType } from '@/lib/supabase/types'

export async function addEvent(
  sessionId: string,
  statType: StatType,
  half: 1 | 2,
  playerId: string | null,
  completed: boolean | null,
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
    .from('game_stat_events')
    .insert({
      session_id: sessionId,
      player_id: playerId,
      stat_type: statType,
      half,
      completed,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function undoEvent(
  eventId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('game_stat_events')
    .delete()
    .eq('id', eventId)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  return {}
}

export async function endSession(
  sessionId: string,
): Promise<{ error?: string }> {
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

  const { error } = await supabase
    .from('game_stat_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) return { error: error.message }
  return {}
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PlayerStatus, MatchLocation, MatchResult } from '@/lib/supabase/types'

// ── Guard ─────────────────────────────────────────────────────────────────────

async function requireGroupCoach(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) return { error: 'No club membership' }

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, club_id')
    .eq('id', groupId)
    .single()

  if (!group || group.club_id !== profile.club_id) return { error: 'Not in this group' }
  if (profile.role !== 'coach' && profile.role !== 'admin') return { error: 'Insufficient role' }

  return { supabase, user, profile }
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function addPlayer(groupId: string, formData: FormData) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase, user } = guard

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Name is required' }

  const positions = formData.getAll('positions') as string[]
  const dob = (formData.get('dob') as string | null) || null
  const status = (formData.get('status') as PlayerStatus) ?? 'available'

  const { data, error } = await supabase
    .from('players')
    .insert({ group_id: groupId, created_by: user.id, name, positions, dob, status })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad`)
  return { id: data.id }
}

export async function updatePlayer(
  groupId: string,
  playerId: string,
  formData: FormData,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { error: 'Name is required' }

  const positions = formData.getAll('positions') as string[]
  const dob = (formData.get('dob') as string | null) || null
  const status = formData.get('status') as PlayerStatus

  const { error } = await supabase
    .from('players')
    .update({ name, positions, dob, status })
    .eq('id', playerId)

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad`)
  revalidatePath(`/groups/${groupId}/squad/${playerId}`)
  return { ok: true }
}

export async function deletePlayer(groupId: string, playerId: string) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad`)
  redirect(`/groups/${groupId}/squad`)
}

export async function updatePlayerStatus(
  groupId: string,
  playerId: string,
  status: PlayerStatus,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase
    .from('players')
    .update({ status })
    .eq('id', playerId)

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad`)
  revalidatePath(`/groups/${groupId}/squad/${playerId}`)
  return { ok: true }
}

// ── Player Notes ──────────────────────────────────────────────────────────────

export async function addPlayerNote(
  groupId: string,
  playerId: string,
  formData: FormData,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase, user } = guard

  const note = (formData.get('note') as string | null)?.trim()
  if (!note) return { error: 'Note cannot be empty' }

  const { error } = await supabase
    .from('player_notes')
    .insert({ player_id: playerId, created_by: user.id, note })

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad/${playerId}`)
  return { ok: true }
}

export async function deletePlayerNote(
  groupId: string,
  playerId: string,
  noteId: string,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase.from('player_notes').delete().eq('id', noteId)
  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad/${playerId}`)
  return { ok: true }
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function addMatch(groupId: string, formData: FormData) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase, user } = guard

  const opponent = (formData.get('opponent') as string | null)?.trim()
  if (!opponent) return { error: 'Opponent is required' }

  const match_date = formData.get('match_date') as string | null
  if (!match_date) return { error: 'Match date is required' }

  const location = (formData.get('location') as MatchLocation) ?? 'home'
  const our_score_raw = formData.get('our_score') as string | null
  const opponent_score_raw = formData.get('opponent_score') as string | null
  const our_score = our_score_raw ? parseInt(our_score_raw, 10) : null
  const opponent_score = opponent_score_raw ? parseInt(opponent_score_raw, 10) : null

  let result: MatchResult | null = null
  if (our_score !== null && opponent_score !== null) {
    result = our_score > opponent_score ? 'win' : our_score < opponent_score ? 'loss' : 'draw'
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({ group_id: groupId, created_by: user.id, opponent, match_date, location, our_score, opponent_score, result })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad`)
  return { id: data.id }
}

export async function deleteMatch(groupId: string, matchId: string) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  const { error } = await supabase.from('matches').delete().eq('id', matchId)
  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad`)
  return { ok: true }
}

// ── Ratings ───────────────────────────────────────────────────────────────────

export async function upsertMatchRating(
  groupId: string,
  playerId: string,
  matchId: string,
  formData: FormData,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase, user } = guard

  const rating = parseInt(formData.get('rating') as string, 10)
  if (isNaN(rating) || rating < 1 || rating > 5) return { error: 'Rating must be 1–5' }
  const notes = (formData.get('notes') as string | null)?.trim() || null

  const { error } = await supabase
    .from('player_match_ratings')
    .upsert(
      { player_id: playerId, match_id: matchId, created_by: user.id, rating, notes },
      { onConflict: 'player_id,match_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad/${playerId}`)
  return { ok: true }
}

export async function upsertSessionRating(
  groupId: string,
  playerId: string,
  sessionPlanId: string,
  formData: FormData,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase, user } = guard

  const attended = formData.get('attended') === 'true'
  const rating_raw = formData.get('rating') as string | null
  const rating = rating_raw ? parseInt(rating_raw, 10) : null
  if (rating !== null && (isNaN(rating) || rating < 1 || rating > 5)) return { error: 'Rating must be 1–5' }
  const notes = (formData.get('notes') as string | null)?.trim() || null

  const { error } = await supabase
    .from('player_session_ratings')
    .upsert(
      { player_id: playerId, session_plan_id: sessionPlanId, created_by: user.id, attended, rating, notes },
      { onConflict: 'player_id,session_plan_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/groups/${groupId}/squad/${playerId}`)
  return { ok: true }
}

// ── Quick attendance toggle ────────────────────────────────────────────────────

export async function toggleAttendance(
  groupId: string,
  playerId: string,
  sessionPlanId: string,
  attended: boolean,
) {
  const guard = await requireGroupCoach(groupId)
  if ('error' in guard) return { error: guard.error }
  const { supabase, user } = guard

  const { error } = await supabase
    .from('player_session_ratings')
    .upsert(
      { player_id: playerId, session_plan_id: sessionPlanId, created_by: user.id, attended },
      { onConflict: 'player_id,session_plan_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/sessions/${sessionPlanId}`)
  return { ok: true }
}

// ── Squad context for AI ───────────────────────────────────────────────────────

export async function getSquadContextForGroup(groupId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const { data: players } = await supabase
    .from('players')
    .select('name, positions, status, dob')
    .eq('group_id', groupId)
    .order('name')

  if (!players?.length) return null

  const lines = players.map(p => {
    const pos = p.positions?.length ? p.positions.join(', ') : 'Position unknown'
    const status = p.status !== 'available' ? ` [${p.status.toUpperCase()}]` : ''
    const age = p.dob
      ? ` (age ${new Date().getFullYear() - new Date(p.dob).getFullYear()})`
      : ''
    return `- ${p.name}${age} — ${pos}${status}`
  })

  return `Here is my squad for ${group?.name ?? 'this group'} (${players.length} players):\n${lines.join('\n')}\n\nPlease keep this squad context in mind for this coaching session.`
}

// web/src/app/(app)/admin/coach-dna/feedback/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getCurrentSeasonLabel } from '@/lib/season'
import type { FeedbackType } from '@/lib/supabase/types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function requireCoach() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, club_id').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
  return { supabase, userId: user.id, clubId: (profile?.club_id as string | null) ?? null }
}

async function coachBelongsToTeam(
  supabase: SupabaseClient,
  userId: string,
  teamId: string,
): Promise<{ belongs: boolean; teamClubId: string | null }> {
  const { data: created } = await supabase
    .from('coaching_groups')
    .select('id, club_id')
    .eq('id', teamId)
    .eq('created_by', userId)
    .maybeSingle()
  if (created) return { belongs: true, teamClubId: (created.club_id as string | null) ?? null }

  const { data: team } = await supabase
    .from('coaching_groups')
    .select('club_id')
    .eq('id', teamId)
    .maybeSingle()
  const teamClubId = (team?.club_id as string | null) ?? null

  const { data: invite } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle()
  return { belongs: !!invite, teamClubId }
}

export async function createFeedbackRequest(formData: FormData) {
  const { supabase, userId, clubId } = await requireCoach()

  const feedbackType = formData.get('feedbackType') as FeedbackType | string
  if (feedbackType !== 'player_voice' && feedbackType !== 'peer_observation') {
    throw new Error('Invalid feedback type')
  }

  const teamId = (formData.get('teamId') as string | null) || null

  if (feedbackType === 'player_voice') {
    if (!teamId) throw new Error('Select a team for player/parent feedback')

    const { belongs, teamClubId } = await coachBelongsToTeam(supabase, userId, teamId)
    // A coach only belongs to a team if they're a member of it AND the team's
    // current club matches their own current club. profiles.club_id is mutable
    // (coaches can switch clubs) and stale group_invitations rows don't get
    // cleaned up on a club switch, so both checks are required — a matching
    // invite alone isn't enough. Any mismatch is reported identically to "not
    // a member" so we don't leak which club the team actually belongs to.
    if (!belongs || teamClubId !== clubId) throw new Error('You are not a member of that team')

    const { data: consent } = await supabase
      .from('club_guardian_consents')
      .select('id')
      .eq('club_id', teamClubId)
      .eq('season_label', getCurrentSeasonLabel())
      .maybeSingle()
    if (!consent) redirect('/admin/coach-dna/feedback/new?error=consent-required')
  }

  const expiresInDays = Number(formData.get('expiresInDays')) || 14
  const requestedThreshold = Number(formData.get('minimumResponseThreshold')) || 3
  const minimumResponseThreshold = Math.max(3, requestedThreshold)
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  const token = randomUUID()

  const { error } = await supabase.from('feedback_requests').insert({
    coach_id: userId,
    feedback_type: feedbackType,
    team_id: feedbackType === 'player_voice' ? teamId : null,
    token,
    expires_at: expiresAt,
    minimum_response_threshold: minimumResponseThreshold,
  })
  if (error) throw new Error(error.message)

  redirect('/admin/coach-dna/feedback')
}

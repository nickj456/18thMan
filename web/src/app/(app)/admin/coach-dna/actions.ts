// web/src/app/(app)/admin/coach-dna/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { retakeEligibility } from '@/lib/coach-dna/retake-eligibility'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
  return { supabase, userId: user.id }
}

export async function startAssessment() {
  const { supabase, userId } = await requireAdmin()

  const { data: lastCompleted, error: lastCompletedError } = await supabase
    .from('assessment_attempts')
    .select('completed_at')
    .eq('coach_id', userId)
    .eq('assessment_type', 'self_assessment')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fail closed: if we can't determine the coach's last completed attempt,
  // don't silently treat that as "never completed one" (always eligible).
  if (lastCompletedError) throw new Error(lastCompletedError.message)

  const { eligible } = retakeEligibility(lastCompleted?.completed_at ?? null)
  if (!eligible) throw new Error('You are not yet eligible to retake this assessment')

  // A coach may already have an unfinished attempt from a previous retake
  // click (e.g. they exited the flow without finishing). Send them back to
  // it instead of creating another orphaned attempt.
  const { data: existingInProgress } = await supabase
    .from('assessment_attempts')
    .select('id')
    .eq('coach_id', userId)
    .eq('assessment_type', 'self_assessment')
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingInProgress) redirect(`/admin/coach-dna/assessment/${existingInProgress.id}`)

  const { data: attempt, error } = await supabase
    .from('assessment_attempts')
    .insert({ coach_id: userId, assessment_type: 'self_assessment', version: 1 })
    .select('id')
    .single()

  if (error || !attempt) throw new Error(error?.message ?? 'Failed to start assessment')

  redirect(`/admin/coach-dna/assessment/${attempt.id}`)
}

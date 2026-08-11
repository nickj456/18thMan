// web/src/app/(app)/admin/coach-dna/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data: attempt, error } = await supabase
    .from('assessment_attempts')
    .insert({ coach_id: userId, assessment_type: 'self_assessment', version: 1 })
    .select('id')
    .single()

  if (error || !attempt) throw new Error(error?.message ?? 'Failed to start assessment')

  redirect(`/admin/coach-dna/assessment/${attempt.id}`)
}

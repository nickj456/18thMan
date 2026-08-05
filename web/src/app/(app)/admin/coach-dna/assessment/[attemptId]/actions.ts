'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuestionProgress } from '@/lib/coach-dna/assessment-progress'

async function requireOwnAttempt(attemptId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  return { supabase, userId: user.id }
}

export async function answerQuestion(attemptId: string, questionId: string, selectedOptionId: string) {
  const { supabase } = await requireOwnAttempt(attemptId)

  const { error: upsertError } = await supabase
    .from('assessment_responses')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, selected_option: selectedOptionId },
      { onConflict: 'attempt_id,question_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  const { data: orderedQuestions } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id')
    .eq('attempt_id', attemptId)

  const progress = getQuestionProgress(orderedQuestions ?? [], (responses ?? []).map(r => r.question_id))

  if (progress.isComplete) {
    const { error: completeError } = await supabase
      .from('assessment_attempts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', attemptId)
    if (completeError) throw new Error(completeError.message)
    redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)
  }

  redirect(`/admin/coach-dna/assessment/${attemptId}?q=${progress.nextQuestion!.id}`)
}

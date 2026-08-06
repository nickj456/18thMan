'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (attempt.completed_at) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)
  return { supabase, userId: user.id }
}

export async function answerQuestion(attemptId: string, questionId: string, selectedOptionId: string) {
  const { supabase } = await requireOwnAttempt(attemptId)

  const { data: option } = await supabase
    .from('assessment_options')
    .select('id')
    .eq('id', selectedOptionId)
    .eq('question_id', questionId)
    .maybeSingle()
  if (!option) throw new Error('Selected option does not belong to this question')

  const { error: upsertError } = await supabase
    .from('assessment_responses')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, selected_option: selectedOptionId },
      { onConflict: 'attempt_id,question_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  const { data: orderedQuestions, error: questionsError } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })
  if (questionsError) throw new Error(questionsError.message)

  const { data: responses, error: responsesError } = await supabase
    .from('assessment_responses')
    .select('question_id')
    .eq('attempt_id', attemptId)
  if (responsesError) throw new Error(responsesError.message)

  const progress = getQuestionProgress(orderedQuestions ?? [], (responses ?? []).map(r => r.question_id))

  // Bust the client Router Cache for this route so navigating "Back" to a
  // question already visited earlier in the session re-fetches the freshly
  // saved answer instead of reusing the stale pre-answer render.
  revalidatePath(`/admin/coach-dna/assessment/${attemptId}`)

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

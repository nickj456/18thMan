'use server'

import { revalidatePath } from 'next/cache'
import { requireFeedbackModerator } from '../require-moderator'

async function responseIdForFlag(supabase: Awaited<ReturnType<typeof requireFeedbackModerator>>['supabase'], flagId: string) {
  const { data: flag } = await supabase.from('safeguarding_flags').select('feedback_answer_id').eq('id', flagId).single()
  if (!flag) return null
  const { data: answer } = await supabase.from('feedback_answers').select('feedback_response_id').eq('id', flag.feedback_answer_id).single()
  return answer?.feedback_response_id ?? null
}

/** False positive: release the response, mark the flag dismissed. */
export async function dismissSafeguardingFlag(flagId: string) {
  const { supabase, userId } = await requireFeedbackModerator()

  const responseId = await responseIdForFlag(supabase, flagId)

  const { error } = await supabase
    .from('safeguarding_flags')
    .update({ status: 'dismissed', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', flagId)
  if (error) return { error: error.message }

  if (responseId) {
    await supabase.from('feedback_responses').update({ held_for_review: false }).eq('id', responseId)
    await supabase.from('admin_feedback_access_log').insert({
      admin_id: userId,
      feedback_response_id: responseId,
      action: 'dismiss_safeguarding_flag',
    })
  }

  revalidatePath('/admin/feedback/safeguarding')
  return { success: true }
}

/** Real concern: keep the response hidden permanently, mark the flag reviewed. */
export async function confirmSafeguardingFlag(flagId: string) {
  const { supabase, userId } = await requireFeedbackModerator()

  const responseId = await responseIdForFlag(supabase, flagId)

  const { error } = await supabase
    .from('safeguarding_flags')
    .update({ status: 'reviewed', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', flagId)
  if (error) return { error: error.message }

  if (responseId) {
    await supabase.from('admin_feedback_access_log').insert({
      admin_id: userId,
      feedback_response_id: responseId,
      action: 'confirm_safeguarding_flag',
    })
  }

  revalidatePath('/admin/feedback/safeguarding')
  return { success: true }
}

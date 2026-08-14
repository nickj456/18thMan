'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** RLS (091) already enforces the coach can only dispute a response to their
 *  own request, and unique(feedback_response_id, raised_by) prevents a
 *  second dispute on the same response -- both surfaced as friendly errors
 *  here rather than leaking the raw RLS/constraint failure. */
export async function raiseDispute(feedbackResponseId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trimmed = reason.trim()
  if (!trimmed) return { error: 'Please explain why you\'re disputing this response.' }

  const { error } = await supabase.from('response_disputes').insert({
    feedback_response_id: feedbackResponseId,
    raised_by: user.id,
    reason: trimmed,
    status: 'open',
  })

  if (error?.code === '23505') return { error: "You've already disputed this response." }
  if (error) return { error: 'Could not raise a dispute for this response.' }

  revalidatePath('/admin/coach-dna/feedback')
  return { success: true }
}

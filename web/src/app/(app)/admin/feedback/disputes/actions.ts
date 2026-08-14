'use server'

import { revalidatePath } from 'next/cache'
import { requireFeedbackModerator } from '../require-moderator'

export async function resolveDispute(disputeId: string, resolution: 'excluded' | 'no_action') {
  const { supabase, userId } = await requireFeedbackModerator()

  const { data: dispute } = await supabase.from('response_disputes').select('id, status').eq('id', disputeId).single()
  if (!dispute) return { error: 'Dispute not found' }
  if (dispute.status !== 'open') return { error: 'This dispute has already been resolved' }

  const { error } = await supabase
    .from('response_disputes')
    .update({ status: resolution, resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('id', disputeId)
    .eq('status', 'open')
  if (error) return { error: error.message }

  revalidatePath('/admin/feedback/disputes')
  return { success: true }
}

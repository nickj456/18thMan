import type { createServiceClient } from '@/lib/supabase/service'
import { sendFeedbackThresholdReachedEmail } from '@/lib/email'

type ServiceClient = ReturnType<typeof createServiceClient>

/** Sends the threshold-reached notification exactly once: the moment a
 *  request's cleared-response count first reaches its
 *  minimum_response_threshold (equality, not >=, so a batch that jumps past
 *  it in one step still fires -- see the caller's own guard for that case).
 *  Called from both submitFeedbackResponse (the clean-submission path) and
 *  dismissSafeguardingFlag (a flagged response later released) -- either can
 *  be the one that tips the count over. Never throws: an email failure must
 *  never block the caller's own success path. */
export async function notifyIfThresholdJustReached(supabase: ServiceClient, feedbackRequestId: string): Promise<void> {
  try {
    const { data: request } = await supabase
      .from('feedback_requests')
      .select('coach_id, feedback_type, minimum_response_threshold')
      .eq('id', feedbackRequestId)
      .single()
    if (!request) return

    const { count } = await supabase
      .from('feedback_responses')
      .select('id', { count: 'exact', head: true })
      .eq('feedback_request_id', feedbackRequestId)
      .eq('held_for_review', false)
    if (count !== request.minimum_response_threshold) return

    const { data: authUser } = await supabase.auth.admin.getUserById(request.coach_id)
    if (!authUser?.user?.email) return

    const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', request.coach_id).single()
    const name = profile?.display_name ?? profile?.username ?? 'Coach'

    await sendFeedbackThresholdReachedEmail(authUser.user.email, name, request.feedback_type as 'player_voice' | 'peer_observation')
  } catch (error) {
    console.error('[feedback] failed to send threshold-reached notification', error)
  }
}

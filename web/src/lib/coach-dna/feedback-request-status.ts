export type FeedbackRequestEligibility = 'accepting' | 'expired' | 'paused'

/** Whether a feedback request is currently accepting public submissions. */
export function feedbackRequestEligibility(request: {
  status: 'active' | 'paused' | 'expired'
  expires_at: string
}): FeedbackRequestEligibility {
  if (new Date(request.expires_at).getTime() <= Date.now()) return 'expired'
  if (request.status === 'paused') return 'paused'
  if (request.status === 'expired') return 'expired'
  return 'accepting'
}

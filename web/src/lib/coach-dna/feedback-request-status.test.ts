import { describe, it, expect } from 'vitest'
import { feedbackRequestEligibility } from './feedback-request-status'

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

describe('feedbackRequestEligibility', () => {
  it('returns accepting for an active, non-expired request', () => {
    expect(feedbackRequestEligibility({ status: 'active', expires_at: future() })).toBe('accepting')
  })

  it('returns expired when expires_at has passed, even if status is still active', () => {
    expect(feedbackRequestEligibility({ status: 'active', expires_at: past() })).toBe('expired')
  })

  it('returns paused for a paused, non-expired request', () => {
    expect(feedbackRequestEligibility({ status: 'paused', expires_at: future() })).toBe('paused')
  })

  it('returns expired for an explicitly expired status', () => {
    expect(feedbackRequestEligibility({ status: 'expired', expires_at: future() })).toBe('expired')
  })

  it('prefers expired over paused when both apply', () => {
    expect(feedbackRequestEligibility({ status: 'paused', expires_at: past() })).toBe('expired')
  })
})

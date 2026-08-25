import { describe, it, expect } from 'vitest'
import { retakeEligibility } from './retake-eligibility'

describe('retakeEligibility', () => {
  it('is eligible with no prior completed attempt', () => {
    const result = retakeEligibility(null)
    expect(result.eligible).toBe(true)
    expect(result.eligibleAt).toBeNull()
  })

  it('is not eligible the day after completion', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = retakeEligibility(yesterday.toISOString())
    expect(result.eligible).toBe(false)
    expect(result.eligibleAt).not.toBeNull()
  })

  it('is eligible exactly 3 months (or more) after completion', () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 1) // safely past the boundary
    const result = retakeEligibility(threeMonthsAgo.toISOString())
    expect(result.eligible).toBe(true)
    expect(result.eligibleAt).toBeNull()
  })

  it('is not eligible one day before the 3-month mark', () => {
    const almostThreeMonthsAgo = new Date()
    almostThreeMonthsAgo.setMonth(almostThreeMonthsAgo.getMonth() - 3)
    almostThreeMonthsAgo.setDate(almostThreeMonthsAgo.getDate() + 1) // 1 day short
    const result = retakeEligibility(almostThreeMonthsAgo.toISOString())
    expect(result.eligible).toBe(false)
  })

  it('computes eligibleAt as exactly 3 calendar months after completedAt, handling month-length rollover', () => {
    // 30 November + 3 months: February doesn't have day 30, so JS Date
    // normalizes this forward to 2 March, not 28/29 February.
    const result = retakeEligibility('2026-11-30T12:00:00.000Z')
    expect(result.eligible).toBe(false)
    expect(result.eligibleAt).toEqual(new Date('2027-03-02T12:00:00.000Z'))
  })
})

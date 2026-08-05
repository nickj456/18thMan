import { describe, it, expect } from 'vitest'
import { computeRecencyWeightedAverage, capOutliers, type SourceResponse } from './response-scoring'

describe('computeRecencyWeightedAverage', () => {
  it('returns 0 for an empty response list', () => {
    expect(computeRecencyWeightedAverage([], new Date('2026-08-05'))).toBe(0)
  })

  it('returns the plain average when all responses are equally recent', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const responses: SourceResponse[] = [
      { value: 60, submittedAt: '2026-08-05T00:00:00Z' },
      { value: 80, submittedAt: '2026-08-05T00:00:00Z' },
    ]
    expect(computeRecencyWeightedAverage(responses, now)).toBeCloseTo(70, 5)
  })

  it('weights recent responses more heavily than old ones', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const responses: SourceResponse[] = [
      { value: 100, submittedAt: '2026-08-04T00:00:00Z' }, // 1 day old
      { value: 0, submittedAt: '2025-01-01T00:00:00Z' },   // over a year old
    ]
    const result = computeRecencyWeightedAverage(responses, now)
    // the recent 100 should dominate a simple 50/50 average
    expect(result).toBeGreaterThan(50)
  })

  it('treats a future-dated submittedAt as zero age rather than negative weight', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const responses: SourceResponse[] = [
      { value: 40, submittedAt: '2026-08-06T00:00:00Z' }, // 1 day "in the future" (clock skew)
    ]
    expect(computeRecencyWeightedAverage(responses, now)).toBeCloseTo(40, 5)
  })
})

describe('capOutliers', () => {
  it('returns responses unchanged when fewer than 3 (not enough data to define an outlier)', () => {
    const responses: SourceResponse[] = [
      { value: 20, submittedAt: '2026-08-01T00:00:00Z' },
      { value: 90, submittedAt: '2026-08-02T00:00:00Z' },
    ]
    expect(capOutliers(responses)).toEqual(responses)
  })

  it('caps a single extreme rating without affecting the others', () => {
    const responses: SourceResponse[] = [
      { value: 70, submittedAt: '2026-08-01T00:00:00Z' },
      { value: 75, submittedAt: '2026-08-02T00:00:00Z' },
      { value: 0, submittedAt: '2026-08-03T00:00:00Z' }, // extreme outlier
    ]
    // median of [0, 70, 75] (sorted) is the middle value, 70
    const capped = capOutliers(responses, 25)
    expect(capped[0].value).toBe(70)
    expect(capped[1].value).toBe(75)
    expect(capped[2].value).toBeGreaterThan(0) // pulled toward the median, not left at the extreme
    expect(capped[2].value).toBe(70 - 25) // median (70) minus the max deviation
  })

  it('a single outlier response does not swing the recency-weighted average by more than the cap allows', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const uncappedResponses: SourceResponse[] = [
      { value: 70, submittedAt: now.toISOString() },
      { value: 75, submittedAt: now.toISOString() },
      { value: 78, submittedAt: now.toISOString() },
      { value: 0, submittedAt: now.toISOString() }, // one extreme outlier
    ]
    const withoutCapping = computeRecencyWeightedAverage(uncappedResponses, now)
    const withCapping = computeRecencyWeightedAverage(capOutliers(uncappedResponses, 25), now)
    // capping must pull the average up compared to leaving the extreme value in
    expect(withCapping).toBeGreaterThan(withoutCapping)
    // and the capped average should stay close to the cluster of normal responses
    expect(withCapping).toBeGreaterThan(60)
  })

  it('does not alter responses within the deviation threshold', () => {
    const responses: SourceResponse[] = [
      { value: 70, submittedAt: '2026-08-01T00:00:00Z' },
      { value: 75, submittedAt: '2026-08-02T00:00:00Z' },
      { value: 80, submittedAt: '2026-08-03T00:00:00Z' },
    ]
    expect(capOutliers(responses, 25)).toEqual(responses)
  })
})

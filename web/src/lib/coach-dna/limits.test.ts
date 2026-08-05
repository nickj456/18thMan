import { describe, it, expect } from 'vitest'
import { applyScoreChangeLimit, buildInsufficientDataMessage } from './limits'
import { getCategoryWeights, getSourceThresholds } from './config'

describe('applyScoreChangeLimit', () => {
  it('returns the new score unclamped when there is no previous score', () => {
    expect(applyScoreChangeLimit(null, 42, 15)).toBe(42)
  })

  it('passes through a change within the allowed delta', () => {
    expect(applyScoreChangeLimit(50, 60, 15)).toBe(60)
  })

  it('clamps an increase larger than the allowed delta', () => {
    expect(applyScoreChangeLimit(50, 90, 15)).toBe(65)
  })

  it('clamps a decrease larger than the allowed delta', () => {
    expect(applyScoreChangeLimit(50, 10, 15)).toBe(35)
  })

  it('uses a sensible default delta when none is provided', () => {
    // default is documented as 15 in the module; a jump of 100 must be clamped to exactly 20+15=35
    expect(applyScoreChangeLimit(20, 120)).toBe(35)
  })
})

describe('buildInsufficientDataMessage', () => {
  it('prompts for the highest-weighted inactive source', () => {
    const weights = getCategoryWeights('teacher') // player_voice weighted highest among typical gaps
    const thresholds = getSourceThresholds('teacher') // player_voice: 3
    const sampleSizes = { self: 1, player_voice: 0, peer_observation: 0, parent_voice: 0 }
    const message = buildInsufficientDataMessage(sampleSizes, thresholds, weights)
    expect(message).toBe('Get 3 more Player Voice responses to unlock this score.')
  })

  it('uses singular phrasing when exactly one more response is needed', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const sampleSizes = { self: 1, player_voice: 2, peer_observation: 0, parent_voice: 0 }
    const message = buildInsufficientDataMessage(sampleSizes, thresholds, weights)
    expect(message).toBe('Get 1 more Player Voice response to unlock this score.')
  })

  it('falls back to a generic message when every source is already at or above threshold', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const sampleSizes = { self: 5, player_voice: 5, peer_observation: 5, parent_voice: 5 }
    const message = buildInsufficientDataMessage(sampleSizes, thresholds, weights)
    expect(message).toBe('Not enough responses yet to calculate this score.')
  })
})

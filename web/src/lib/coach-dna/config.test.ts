import { describe, it, expect } from 'vitest'
import { getCategoryWeights, getSourceThresholds, getSampleSizeConfidence, SOURCE_LABELS } from './config'

describe('getCategoryWeights', () => {
  it('returns the default weight split for a category with no override', () => {
    expect(getCategoryWeights('teacher')).toEqual({
      self: 25,
      player_voice: 35,
      peer_observation: 30,
      parent_voice: 10,
    })
  })

  it('returns the Technician override', () => {
    expect(getCategoryWeights('technician')).toEqual({
      self: 25,
      player_voice: 15,
      peer_observation: 60,
      parent_voice: 0,
    })
  })

  it('returns the Culture Builder override', () => {
    expect(getCategoryWeights('culture-builder')).toEqual({
      self: 15,
      player_voice: 40,
      peer_observation: 25,
      parent_voice: 20,
    })
  })

  it('every weight config sums to 100', () => {
    for (const slug of ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']) {
      const weights = getCategoryWeights(slug)
      const sum = weights.self + weights.player_voice + weights.peer_observation + weights.parent_voice
      expect(sum).toBe(100)
    }
  })
})

describe('getSourceThresholds', () => {
  it('returns the default minimum response thresholds', () => {
    expect(getSourceThresholds('teacher')).toEqual({
      self: 1,
      player_voice: 3,
      peer_observation: 1,
      parent_voice: 3,
    })
  })
})

describe('SOURCE_LABELS', () => {
  it('has a human-readable label for every source', () => {
    expect(SOURCE_LABELS).toEqual({
      self: 'Self-Assessment',
      player_voice: 'Player Voice',
      peer_observation: 'Peer Coach',
      parent_voice: 'Parent Voice',
    })
  })
})

describe('getSampleSizeConfidence', () => {
  it('returns full confidence (1) for self and peer_observation regardless of sample size', () => {
    expect(getSampleSizeConfidence('self', 1)).toBe(1)
    expect(getSampleSizeConfidence('peer_observation', 1)).toBe(1)
  })

  it('scales confidence linearly toward the target sample size for player_voice', () => {
    expect(getSampleSizeConfidence('player_voice', 3)).toBeCloseTo(0.3, 5)
    expect(getSampleSizeConfidence('player_voice', 5)).toBeCloseTo(0.5, 5)
  })

  it('caps confidence at 1 once the target sample size is reached', () => {
    expect(getSampleSizeConfidence('player_voice', 10)).toBe(1)
    expect(getSampleSizeConfidence('player_voice', 25)).toBe(1)
  })

  it('scales parent_voice the same way as player_voice', () => {
    expect(getSampleSizeConfidence('parent_voice', 5)).toBeCloseTo(0.5, 5)
  })
})

import { describe, it, expect } from 'vitest'
import { computeCategoryScore, type SourceInput } from './scoring'
import { getCategoryWeights, getSourceThresholds } from './config'

const NOW = new Date('2026-08-05T00:00:00Z')

function response(value: number, daysAgo = 0) {
  const d = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return { value, submittedAt: d.toISOString() }
}

describe('computeCategoryScore', () => {
  it('all sources active: returns a scored result blending every source', () => {
    const weights = getCategoryWeights('teacher') // self 25 / player 35 / peer 30 / parent 10
    const thresholds = getSourceThresholds('teacher') // self 1 / player 3 / peer 1 / parent 3
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(90)] },
      { source: 'parent_voice', responses: [response(60), response(65), response(62)] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('scored')
    if (result.status === 'scored') {
      // sanity: blended score is a weighted mix, must land strictly between the min and max source score
      expect(result.blendedScore).toBeGreaterThan(60)
      expect(result.blendedScore).toBeLessThan(90)
      expect(result.sourceScores.self).toBeCloseTo(80, 1)
      expect(result.sourceScores.peer_observation).toBeCloseTo(90, 1)
    }
  })

  it('one source missing: redistributes weight proportionally and still scores', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(90)] },
      { source: 'parent_voice', responses: [] }, // below threshold — MVP has no Parent Voice yet
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('scored')
  })

  it('two sources missing: still scores as long as two remain active', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [] },
      { source: 'parent_voice', responses: [] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('scored')
  })

  it('below threshold everywhere: returns INSUFFICIENT_DATA, never a fabricated number', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] }, // only self active — explicitly insufficient per design doc
      { source: 'player_voice', responses: [] },
      { source: 'peer_observation', responses: [] },
      { source: 'parent_voice', responses: [] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('insufficient_data')
    if (result.status === 'insufficient_data') {
      expect(result.message).toContain('more')
      expect(result.message).toContain('unlock this score')
    }
    // TypeScript-level guarantee: an insufficient_data result has no blendedScore field at all
    expect((result as { blendedScore?: number }).blendedScore).toBeUndefined()
  })

  it('zero responses anywhere: returns INSUFFICIENT_DATA', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [] },
      { source: 'player_voice', responses: [] },
      { source: 'peer_observation', responses: [] },
      { source: 'parent_voice', responses: [] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('insufficient_data')
  })

  it('a single outlier peer-observation response does not swing the score', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const withoutOutlier: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(75), response(78), response(80)] },
    ]
    const withOutlier: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(75), response(78), response(0)] }, // one extreme outlier added
    ]
    const resultWithout = computeCategoryScore(withoutOutlier, weights, thresholds, NOW)
    const resultWith = computeCategoryScore(withOutlier, weights, thresholds, NOW)
    expect(resultWithout.status).toBe('scored')
    expect(resultWith.status).toBe('scored')
    if (resultWithout.status === 'scored' && resultWith.status === 'scored') {
      // the outlier must not drag the blended score down by more than a few points.
      // This bound is tight enough to fail if capOutliers is not actually applied:
      // capped difference ≈ 3.333, uncapped difference ≈ 8.889.
      expect(resultWithout.blendedScore - resultWith.blendedScore).toBeLessThan(5)
    }
    if (resultWith.status === 'scored') {
      // capOutliers pulls the 0 up to median-25=50, so the peer_observation source score
      // should reflect the capped value (~67.7), not the raw uncapped mean (51)
      expect(resultWith.sourceScores.peer_observation).toBeGreaterThan(60)
    }
  })

  it('weight redistribution always sums to 100% regardless of which sources are active', () => {
    const weights = getCategoryWeights('culture-builder') // self 15 / player 40 / peer 25 / parent 20
    const thresholds = getSourceThresholds('culture-builder')
    const activeSubsets: SourceInput[][] = [
      [
        { source: 'self', responses: [response(50)] },
        { source: 'player_voice', responses: [response(50), response(50), response(50)] },
      ],
      [
        { source: 'player_voice', responses: [response(50), response(50), response(50)] },
        { source: 'peer_observation', responses: [response(50)] },
        { source: 'parent_voice', responses: [response(50), response(50), response(50)] },
      ],
    ]
    for (const inputs of activeSubsets) {
      const result = computeCategoryScore(inputs, weights, thresholds, NOW)
      expect(result.status).toBe('scored')
      // if every active source reports the identical value, the blend must equal that value —
      // this only holds if the redistributed weights actually summed to 100
      if (result.status === 'scored') {
        expect(result.blendedScore).toBeCloseTo(50, 1)
      }
    }
  })

  it('does not fabricate a score for a source with zero responses even if its threshold is configured as 0', () => {
    const weights = getCategoryWeights('teacher')
    const zeroThresholdConfig = { ...getSourceThresholds('teacher'), peer_observation: 0 }
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [] }, // zero responses, but threshold is 0
    ]
    const result = computeCategoryScore(inputs, weights, zeroThresholdConfig, NOW)
    // peer_observation must NOT be treated as active just because 0 >= 0 — it has no data
    if (result.status === 'scored') {
      expect(result.sourceScores.peer_observation).toBeUndefined()
      // if peer_observation were wrongly treated as active (old buggy filter), it would
      // contribute a fabricated 0 at full weight and drag blendedScore down to ~50.35;
      // correctly excluding it keeps the blend at ~75.53 (self=80, player_voice≈72.33 only)
      expect(result.blendedScore).toBeGreaterThan(70)
    }
    // with peer_observation correctly excluded, only self + player_voice are active (2 sources) — still scoreable
    expect(result.status).toBe('scored')
  })

  it('applies the score change limit against a previous score', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(100)] },
      { source: 'player_voice', responses: [response(100), response(100), response(100)] },
      { source: 'peer_observation', responses: [response(100)] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW, 20) // previous score was 20
    expect(result.status).toBe('scored')
    if (result.status === 'scored') {
      // even though every source reports 100, the jump from a previous score of 20 must be capped
      expect(result.blendedScore).toBeLessThan(100)
      expect(result.blendedScore).toBeLessThanOrEqual(35) // default max delta is 15
    }
  })
})

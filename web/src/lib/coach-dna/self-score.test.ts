import { describe, it, expect } from 'vitest'
import { computeSelfOnlyCategoryScores } from './self-score'

function optionWeighting(id: string, weights: Record<string, number>) {
  return { id, categoryWeights: weights }
}

describe('computeSelfOnlyCategoryScores', () => {
  it('scores 100 for a category always picked as "most" whenever it was offered', () => {
    const options = [
      optionWeighting('teacher-opt', { teacher: 100 }),
      optionWeighting('motivator-opt', { motivator: 100 }),
    ]
    // 12 responses where teacher is the "most" pick, motivator (never teacher) as "least"
    const responses = Array.from({ length: 12 }, () => ({
      mostOptionId: 'teacher-opt',
      leastOptionId: 'motivator-opt',
    }))

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(100)
  })

  it('scores 0 for a category always picked as "least" whenever it was offered', () => {
    const options = [
      optionWeighting('teacher-opt', { teacher: 100 }),
      optionWeighting('motivator-opt', { motivator: 100 }),
    ]
    const responses = Array.from({ length: 12 }, () => ({
      mostOptionId: 'motivator-opt',
      leastOptionId: 'teacher-opt',
    }))

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(0)
  })

  it('scores 50 (neutral) for an empty responses array, across all 8 categories', () => {
    const result = computeSelfOnlyCategoryScores([], [])
    expect(result).toHaveLength(8)
    expect(result.every(r => r.score === 50)).toBe(true)
  })

  it('lands proportionally between 0 and 100 for a mix of most/least picks', () => {
    const options = [
      optionWeighting('teacher-opt', { teacher: 100 }),
      optionWeighting('motivator-opt', { motivator: 100 }),
    ]
    // teacher picked "most" 3 times, "least" 1 time -> sum = +2 -> (2+12)*100/24
    const responses = [
      ...Array.from({ length: 3 }, () => ({ mostOptionId: 'teacher-opt', leastOptionId: 'motivator-opt' })),
      { mostOptionId: 'motivator-opt', leastOptionId: 'teacher-opt' },
    ]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBeCloseTo((2 + 12) * 100 / 24)
  })

  it('ignores a mostOptionId/leastOptionId with no matching option (defensive, should not crash)', () => {
    const options = [optionWeighting('teacher-opt', { teacher: 100 })]
    const responses = [{ mostOptionId: 'teacher-opt', leastOptionId: 'missing-option' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    // teacher gets +1 (was "most"), no category gets -1 since the least option doesn't resolve
    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBeCloseTo((1 + 12) * 100 / 24)
  })

  it('returns all 8 categories even when responses only touch some of them', () => {
    const options = [optionWeighting('teacher-opt', { teacher: 100 }), optionWeighting('motivator-opt', { motivator: 100 })]
    const responses = [{ mostOptionId: 'teacher-opt', leastOptionId: 'motivator-opt' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result).toHaveLength(8)
    expect(result.map(r => r.categorySlug).sort()).toEqual(
      ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder'].sort(),
    )
  })
})

import { describe, it, expect } from 'vitest'
import { computeSelfOnlyCategoryScores } from './self-score'

const CATEGORIES = ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']

function optionWeighting(id: string, weights: Record<string, number>) {
  return { id, categoryWeights: weights }
}

describe('computeSelfOnlyCategoryScores', () => {
  it('returns all 8 categories even when responses only touch some of them', () => {
    const options = [optionWeighting('opt-1', { teacher: 100 })]
    const responses = [{ selectedOptionId: 'opt-1' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result).toHaveLength(8)
    expect(result.map(r => r.categorySlug).sort()).toEqual([...CATEGORIES].sort())
  })

  it('averages weight across every selected option, treating an unweighted category as 0 for that option', () => {
    const options = [
      optionWeighting('opt-1', { teacher: 100 }),
      optionWeighting('opt-2', { teacher: 0, motivator: 100 }),
    ]
    const responses = [{ selectedOptionId: 'opt-1' }, { selectedOptionId: 'opt-2' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(50) // (100 + 0) / 2
    expect(result.find(r => r.categorySlug === 'motivator')?.score).toBe(50) // (0 + 100) / 2
    expect(result.find(r => r.categorySlug === 'organiser')?.score).toBe(0) // never weighted, never selected
  })

  it('returns all 8 categories at 0 for an empty responses array', () => {
    const result = computeSelfOnlyCategoryScores([], [])
    expect(result).toHaveLength(8)
    expect(result.every(r => r.score === 0)).toBe(true)
  })

  it('ignores a selectedOptionId that has no matching option (defensive, should not crash)', () => {
    const options = [optionWeighting('opt-1', { teacher: 100 })]
    const responses = [{ selectedOptionId: 'opt-1' }, { selectedOptionId: 'missing-option' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(50) // (100 + 0) / 2, missing option treated as 0 across every category
  })
})

import { describe, it, expect } from 'vitest'
import { deriveArchetype } from './archetype'
import type { SelfCategoryScore } from './self-score'

function scores(overrides: Record<string, number>): SelfCategoryScore[] {
  const base = ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']
  return base.map(categorySlug => ({ categorySlug, score: overrides[categorySlug] ?? 50 }))
}

describe('deriveArchetype', () => {
  it('picks the highest-scoring category as primaryType', () => {
    const result = deriveArchetype(scores({ teacher: 90 }))
    expect(result.primaryType).toBe('teacher')
  })

  it('sets secondaryType when the second-highest is within 10 points of the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 80 }))
    expect(result.primaryType).toBe('teacher')
    expect(result.secondaryType).toBe('motivator')
  })

  it('sets secondaryType to null when the second-highest is more than 10 points behind the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 79 }))
    expect(result.secondaryType).toBeNull()
  })

  it('breaks ties by fixed category display order, not randomly', () => {
    // teacher comes before technician in CATEGORY_SLUGS order
    const result = deriveArchetype(scores({ teacher: 80, technician: 80 }))
    expect(result.primaryType).toBe('teacher')
  })

  it('returns all 8 categories, ranked by score descending, each carrying its score', () => {
    const result = deriveArchetype(scores({
      teacher: 90, motivator: 85, developer: 80,
      technician: 20, organiser: 15, communicator: 10,
      'game-manager': 55, 'culture-builder': 50,
    }))
    expect(result.categories).toHaveLength(8)
    expect(result.categories.map(c => c.categorySlug)).toEqual([
      'teacher', 'motivator', 'developer', 'game-manager', 'culture-builder', 'technician', 'organiser', 'communicator',
    ])
    expect(result.categories[0].score).toBe(90)
    expect(result.categories.every(c => typeof c.score === 'number')).toBe(true)
  })

  it('tags the top 3 ranked categories as strength, the next 2 as solid, the bottom 3 as focus', () => {
    const result = deriveArchetype(scores({
      teacher: 90, motivator: 85, developer: 80,
      technician: 20, organiser: 15, communicator: 10,
      'game-manager': 55, 'culture-builder': 50,
    }))
    expect(result.categories.map(c => c.tier)).toEqual([
      'strength', 'strength', 'strength', 'solid', 'solid', 'focus', 'focus', 'focus',
    ])
  })
})

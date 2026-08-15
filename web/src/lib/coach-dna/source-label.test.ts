import { describe, it, expect } from 'vitest'
import { sourceTagFor, allCategoriesSelfOnly } from './source-label'

describe('sourceTagFor', () => {
  it('returns null when the category is self-only', () => {
    expect(sourceTagFor({ teacher: ['self'] }, 'teacher')).toBeNull()
  })

  it('returns null when sourcedCategories is missing entirely (pre-existing persisted rows)', () => {
    expect(sourceTagFor(undefined, 'teacher')).toBeNull()
  })

  it('returns null when the category is absent from sourcedCategories', () => {
    expect(sourceTagFor({}, 'teacher')).toBeNull()
  })

  it('returns a tag naming the one external source', () => {
    expect(sourceTagFor({ teacher: ['self', 'player_voice'] }, 'teacher')).toBe('Includes player feedback')
  })

  it('returns a tag naming multiple external sources', () => {
    expect(sourceTagFor({ teacher: ['self', 'player_voice', 'peer_observation'] }, 'teacher')).toBe(
      'Includes player and peer feedback',
    )
  })

  it('handles parent_voice with its own label', () => {
    expect(sourceTagFor({ teacher: ['self', 'parent_voice'] }, 'teacher')).toBe('Includes parent feedback')
  })
})

describe('allCategoriesSelfOnly', () => {
  it('returns true when sourcedCategories is undefined', () => {
    expect(allCategoriesSelfOnly(undefined, ['teacher', 'motivator'])).toBe(true)
  })

  it('returns true when every listed category is self-only', () => {
    expect(allCategoriesSelfOnly({ teacher: ['self'], motivator: ['self'] }, ['teacher', 'motivator'])).toBe(true)
  })

  it('returns false when at least one category has an external source', () => {
    expect(allCategoriesSelfOnly({ teacher: ['self', 'player_voice'], motivator: ['self'] }, ['teacher', 'motivator'])).toBe(false)
  })
})

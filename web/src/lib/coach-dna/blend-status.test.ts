import { describe, it, expect } from 'vitest'
import { hasBlendedFeedback, sourcedCategoriesEqual } from './blend-status'

describe('hasBlendedFeedback', () => {
  it('is false when sourcedCategories is undefined', () => {
    expect(hasBlendedFeedback(undefined)).toBe(false)
  })

  it('is false when every category is self-only', () => {
    expect(hasBlendedFeedback({ teacher: ['self'], motivator: ['self'] })).toBe(false)
  })

  it('is true when any category has a non-self source', () => {
    expect(hasBlendedFeedback({ teacher: ['self'], motivator: ['self', 'player_voice'] })).toBe(true)
  })
})

describe('sourcedCategoriesEqual', () => {
  it('is false when cached is undefined', () => {
    expect(sourcedCategoriesEqual(undefined, { teacher: ['self'] })).toBe(false)
  })

  it('is true for identical single-source maps', () => {
    expect(sourcedCategoriesEqual({ teacher: ['self'] }, { teacher: ['self'] })).toBe(true)
  })

  it('is false when a category gained a new source', () => {
    expect(sourcedCategoriesEqual({ motivator: ['self'] }, { motivator: ['self', 'player_voice'] })).toBe(false)
  })

  it('ignores source order within a category', () => {
    expect(sourcedCategoriesEqual({ motivator: ['player_voice', 'self'] }, { motivator: ['self', 'player_voice'] })).toBe(true)
  })

  it('is false when the set of categories differs', () => {
    expect(sourcedCategoriesEqual({ teacher: ['self'] }, { teacher: ['self'], motivator: ['self'] })).toBe(false)
  })
})

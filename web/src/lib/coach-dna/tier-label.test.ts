import { describe, it, expect } from 'vitest'
import { tierLabel } from './tier-label'

describe('tierLabel', () => {
  it('labels strength as Strong', () => {
    expect(tierLabel('strength')).toBe('Strong')
  })

  it('labels solid as Developing', () => {
    expect(tierLabel('solid')).toBe('Developing')
  })

  it('labels focus as Focus area', () => {
    expect(tierLabel('focus')).toBe('Focus area')
  })
})

import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Season One - Rugby League Coaching Guide')).toBe('season-one-rugby-league-coaching-guide')
  })

  it('strips diacritics', () => {
    expect(slugify('Café Playbook')).toBe('cafe-playbook')
  })

  it('collapses non-alphanumeric runs into a single hyphen', () => {
    expect(slugify('Attack & Defence!! (2026)')).toBe('attack-defence-2026')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Edge Cases--  ')).toBe('edge-cases')
  })

  it('falls back to "product" when nothing alphanumeric remains', () => {
    expect(slugify('!!!')).toBe('product')
  })

  it('truncates to 80 characters without a trailing hyphen', () => {
    const long = 'a'.repeat(100)
    const result = slugify(long)
    expect(result.length).toBeLessThanOrEqual(80)
    expect(result.endsWith('-')).toBe(false)
  })
})

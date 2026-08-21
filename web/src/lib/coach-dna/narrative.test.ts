import { describe, it, expect } from 'vitest'
import { firstSentence } from './narrative'

describe('firstSentence', () => {
  it('returns only the first sentence when multiple sentences are present', () => {
    expect(firstSentence('As a Motivator type coach, you have a strong foundation. Your strengths in Motivator, Organiser, and Game Manager help you connect fast.'))
      .toBe('As a Motivator type coach, you have a strong foundation.')
  })

  it('returns the whole text unchanged when it is already a single sentence', () => {
    expect(firstSentence('You build trust fast.')).toBe('You build trust fast.')
  })

  it('handles ! and ? as sentence terminators', () => {
    expect(firstSentence("Great instincts! Keep leaning into it.")).toBe('Great instincts!')
    expect(firstSentence('Ready to lead? Absolutely.')).toBe('Ready to lead?')
  })

  it('falls back to the full text when there is no terminating punctuation', () => {
    expect(firstSentence('Strong foundation to build on')).toBe('Strong foundation to build on')
  })

  it('returns an empty string for empty input', () => {
    expect(firstSentence('')).toBe('')
  })
})

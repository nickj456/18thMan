import { describe, it, expect, vi, afterEach } from 'vitest'
import { getCurrentSeasonLabel } from './season'

describe('getCurrentSeasonLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current calendar year as a string', () => {
    vi.setSystemTime(new Date('2026-08-12T00:00:00.000Z'))
    expect(getCurrentSeasonLabel()).toBe('2026')
  })

  it('returns a different year correctly', () => {
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'))
    expect(getCurrentSeasonLabel()).toBe('2027')
  })
})

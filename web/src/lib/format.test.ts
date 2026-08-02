import { describe, it, expect } from 'vitest'
import { formatCents } from './format'

describe('formatCents', () => {
  it('formats whole pounds', () => {
    expect(formatCents(150000)).toBe('£1,500.00')
  })

  it('formats pence correctly', () => {
    expect(formatCents(1050)).toBe('£10.50')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('£0.00')
  })
})

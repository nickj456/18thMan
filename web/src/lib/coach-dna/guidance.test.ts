import { describe, it, expect } from 'vitest'
import { buildGuidance } from './guidance'

const BASE = { hasAnyFeedbackRequest: false, activeRequestsBelowThreshold: false, hasBlendedFeedback: false, focusCategories: [] as string[] }

describe('buildGuidance', () => {
  it('suggests requesting feedback when none has ever been requested', () => {
    const steps = buildGuidance(BASE)
    expect(steps).toHaveLength(1)
    expect(steps[0].href).toBe('/admin/coach-dna/feedback')
    expect(steps[0].linkLabel).toBe('Request feedback')
  })

  it('suggests requesting more when active requests exist but are below threshold', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true, activeRequestsBelowThreshold: true })
    expect(steps).toHaveLength(1)
    expect(steps[0].linkLabel).toBe('View feedback requests')
    expect(steps[0].body).toContain('close')
  })

  it('returns three focus-category-referencing steps once feedback has blended', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true, hasBlendedFeedback: true, focusCategories: ['game-manager', 'organiser'] })
    expect(steps).toHaveLength(3)
    expect(steps.every(s => s.body.includes('Game Manager'))).toBe(true)
    expect(steps.map(s => s.href)).toEqual(['/sessions/new', '/drills', '/chat/ai'])
    expect(steps.map(s => s.linkLabel)).toEqual(['Plan a session', 'Browse drills', 'Open AI chat'])
  })

  it('returns a single affirming step with no link when blended and no focus categories remain', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true, hasBlendedFeedback: true, focusCategories: [] })
    expect(steps).toHaveLength(1)
    expect(steps[0].href).toBeNull()
    expect(steps[0].linkLabel).toBeNull()
  })

  it('prioritizes "request feedback" over "blended" if both booleans are somehow true (defensive ordering)', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: false, hasBlendedFeedback: true, focusCategories: ['teacher'] })
    expect(steps[0].href).toBe('/admin/coach-dna/feedback')
  })

  it('falls back to a single generic step when no rule matches (defensive)', () => {
    // hasAnyFeedbackRequest true, activeRequestsBelowThreshold false, hasBlendedFeedback false --
    // outside the 3 documented states (no request / below threshold / blended).
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true })
    expect(steps).toHaveLength(1)
    expect(steps[0].href).toBe('/admin/coach-dna')
  })
})

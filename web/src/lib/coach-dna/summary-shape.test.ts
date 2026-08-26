import { describe, it, expect } from 'vitest'
import { isCurrentSummaryShape } from './summary-shape'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

function makeSummary(categories: SelfAssessmentSummary['categories']): SelfAssessmentSummary {
  return {
    primaryType: 'teacher',
    secondaryType: null,
    narrative: 'x',
    categories,
  } as SelfAssessmentSummary
}

describe('isCurrentSummaryShape', () => {
  it('returns true when every category has a resources array', () => {
    const summary = makeSummary([
      { categorySlug: 'communication', score: 80, tier: 'strength', text: 'x', resources: [] },
      { categorySlug: 'tactics', score: 20, tier: 'focus', text: 'y', resources: [{ title: 't', description: 'd', url: null }] },
    ])
    expect(isCurrentSummaryShape(summary)).toBe(true)
  })

  it('returns false when a category is missing resources (legacy shape)', () => {
    const summary = makeSummary([
      { categorySlug: 'communication', score: 80, tier: 'strength', text: 'x' } as unknown as SelfAssessmentSummary['categories'][number],
    ])
    expect(isCurrentSummaryShape(summary)).toBe(false)
  })

  it('returns false when categories is missing entirely (pre-tier legacy shape)', () => {
    const legacy = { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] } as unknown as SelfAssessmentSummary
    expect(isCurrentSummaryShape(legacy)).toBe(false)
  })

  it('returns true vacuously when categories is empty', () => {
    const summary = makeSummary([])
    expect(isCurrentSummaryShape(summary)).toBe(true)
  })
})

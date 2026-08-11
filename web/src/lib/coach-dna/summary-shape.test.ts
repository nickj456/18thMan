import { describe, it, expect } from 'vitest'
import { isCurrentSummaryShape } from './summary-shape'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

function makeSummary(cons: SelfAssessmentSummary['cons']): SelfAssessmentSummary {
  return {
    primaryType: 'teacher',
    secondaryType: null,
    narrative: 'x',
    pros: [],
    cons,
  } as SelfAssessmentSummary
}

describe('isCurrentSummaryShape', () => {
  it('returns true when every con has a resources array', () => {
    const summary = makeSummary([
      { categorySlug: 'communication', text: 'x', resources: [] },
      { categorySlug: 'tactics', text: 'y', resources: [{ title: 't', description: 'd', url: null }] },
    ])
    expect(isCurrentSummaryShape(summary)).toBe(true)
  })

  it('returns false when a con is missing resources (legacy shape)', () => {
    const summary = makeSummary([
      { categorySlug: 'communication', text: 'x' } as unknown as SelfAssessmentSummary['cons'][number],
    ])
    expect(isCurrentSummaryShape(summary)).toBe(false)
  })

  it('returns true vacuously when cons is empty', () => {
    const summary = makeSummary([])
    expect(isCurrentSummaryShape(summary)).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { buildCardData } from './card-data'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const BASE_SUMMARY: SelfAssessmentSummary = {
  primaryType: 'motivator',
  secondaryType: null,
  narrative: '',
  pros: [],
  cons: [],
}

describe('buildCardData', () => {
  it('labels the primary type and omits secondary when absent', () => {
    const data = buildCardData(BASE_SUMMARY)
    expect(data.primaryLabel).toBe('Motivator')
    expect(data.secondaryLabel).toBeNull()
  })

  it('labels the secondary type when present', () => {
    const data = buildCardData({ ...BASE_SUMMARY, secondaryType: 'organiser' })
    expect(data.secondaryLabel).toBe('Organiser')
  })

  it('labels every strength and focus area, not just the first', () => {
    const data = buildCardData({
      ...BASE_SUMMARY,
      pros: [
        { categorySlug: 'communicator', text: '...' },
        { categorySlug: 'motivator', text: '...' },
      ],
      cons: [
        { categorySlug: 'game-manager', text: '...', resources: [] },
        { categorySlug: 'organiser', text: '...', resources: [] },
      ],
    })
    expect(data.strengthLabels).toEqual(['Communicator', 'Motivator'])
    expect(data.focusAreaLabels).toEqual(['Game Manager', 'Organiser'])
  })

  it('returns empty arrays when pros/cons are empty', () => {
    const data = buildCardData(BASE_SUMMARY)
    expect(data.strengthLabels).toEqual([])
    expect(data.focusAreaLabels).toEqual([])
  })

  it('reduces the narrative to its first sentence, never null unless the narrative itself is empty', () => {
    const data = buildCardData({
      ...BASE_SUMMARY,
      narrative: 'You build trust fast. Your sessions stay focused on the fundamentals.',
    })
    expect(data.narrativeSnippet).toBe('You build trust fast.')
  })

  it('returns a null narrative snippet when there is no narrative', () => {
    const data = buildCardData(BASE_SUMMARY)
    expect(data.narrativeSnippet).toBeNull()
  })
})

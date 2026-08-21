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

  it('labels the top strength and focus area from the first pro/con', () => {
    const data = buildCardData({
      ...BASE_SUMMARY,
      pros: [{ categorySlug: 'communicator', text: '...' }],
      cons: [{ categorySlug: 'game-manager', text: '...', resources: [] }],
    })
    expect(data.topStrengthLabel).toBe('Communicator')
    expect(data.focusAreaLabel).toBe('Game Manager')
  })

  it('returns null strength/focus when pros/cons are empty', () => {
    const data = buildCardData(BASE_SUMMARY)
    expect(data.topStrengthLabel).toBeNull()
    expect(data.focusAreaLabel).toBeNull()
  })
})

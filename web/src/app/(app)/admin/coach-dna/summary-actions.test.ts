// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  responses: { question_id: string; selected_option: string }[]
  options: { id: string; question_id: string; category_weights_json: Record<string, number> }[]
  aiText: string
  upsertError: { message: string } | null
} = {
  user: null,
  attempt: null,
  responses: [],
  options: [],
  aiText: '',
  upsertError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => () => 'mock-model',
}))
vi.mock('ai', () => ({
  generateText: async () => ({ text: state.aiText }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'assessment_attempts') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      }
      if (table === 'assessment_responses') {
        return { select: () => ({ eq: async () => ({ data: state.responses }) }) }
      }
      if (table === 'assessment_options') {
        return { select: () => ({ in: async () => ({ data: state.options }) }) }
      }
      if (table === 'coach_profiles') {
        return { upsert: upsertMock }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { generateSelfAssessmentSummary } from './summary-actions'

describe('generateSelfAssessmentSummary', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1' }]
    state.options = [{ id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } }]
    state.aiText = JSON.stringify({
      narrative: 'You lead with clarity and patience.',
      pros: [{ categorySlug: 'teacher', text: 'You explain things well.' }],
      cons: [{ categorySlug: 'organiser', text: 'Sessions could run tighter.' }],
    })
    state.upsertError = null
    upsertMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/login')
  })

  it('rejects an attempt that does not belong to the caller', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/admin/coach-dna')
  })

  it('rejects an attempt that is not yet completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('not completed')
  })

  it('persists and returns the summary on success', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    expect(result.primaryType).toBe('teacher')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'coach-1',
        primary_profile_type: 'teacher',
      }),
      expect.objectContaining({ onConflict: 'user_id' }),
    )
  })

  it('throws without persisting when Groq returns unparseable output', async () => {
    state.aiText = 'not json'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when the DB write fails', async () => {
    state.upsertError = { message: 'db down' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('db down')
  })
})

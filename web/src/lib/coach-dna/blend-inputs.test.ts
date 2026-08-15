// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  requestIds: string[]
  responses: { id: string; respondent_type: string; submitted_at: string }[]
  answers: { numeric_value: number | null; feedback_response_id: string; question_id: string; assessment_questions: { dna_categories: { slug: string } } }[]
  excludedResponseIds: string[]
} = {
  requestIds: [],
  responses: [],
  answers: [],
  excludedResponseIds: [],
}

function makeClient() {
  return {
    from: (table: string) => {
      if (table === 'feedback_requests') {
        return { select: () => ({ eq: async () => ({ data: state.requestIds.map(id => ({ id })) }) }) }
      }
      if (table === 'feedback_responses') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: state.responses }),
            }),
          }),
        }
      }
      if (table === 'feedback_answers') {
        return {
          select: () => ({
            in: () => ({
              not: async () => ({ data: state.answers }),
            }),
          }),
        }
      }
      if (table === 'response_disputes') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: state.excludedResponseIds.map(id => ({ feedback_response_id: id })) }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }
}

import { fetchBlendInputs } from './blend-inputs'

describe('fetchBlendInputs', () => {
  beforeEach(() => {
    state.requestIds = ['req-1']
    state.responses = []
    state.answers = []
    state.excludedResponseIds = []
  })

  it('returns an empty object for a coach with no external feedback', async () => {
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    expect(result).toEqual({})
  })

  it('maps respondent_type player -> source player_voice', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'player', submitted_at: '2026-08-14T00:00:00Z' }]
    state.answers = [{ numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } }]
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    expect(result.teacher).toHaveLength(1)
    expect(result.teacher[0].source).toBe('player_voice')
  })

  it('maps respondent_type parent -> source parent_voice', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'parent', submitted_at: '2026-08-14T00:00:00Z' }]
    state.answers = [{ numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } }]
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    expect(result.teacher[0].source).toBe('parent_voice')
  })

  it('maps respondent_type peer_coach -> source peer_observation', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'peer_coach', submitted_at: '2026-08-14T00:00:00Z' }]
    state.answers = [{ numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } }]
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    expect(result.teacher[0].source).toBe('peer_observation')
  })

  it('normalizes rating 1 -> 0, 3 -> 50, 5 -> 100', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'peer_coach', submitted_at: '2026-08-14T00:00:00Z' },
      { id: 'resp-2', respondent_type: 'peer_coach', submitted_at: '2026-08-14T00:00:00Z' },
      { id: 'resp-3', respondent_type: 'peer_coach', submitted_at: '2026-08-14T00:00:00Z' },
    ]
    state.answers = [
      { numeric_value: 1, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 3, feedback_response_id: 'resp-2', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 5, feedback_response_id: 'resp-3', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
    ]
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    const values = result.teacher[0].responses.map(r => r.value).sort((a, b) => a - b)
    expect(values).toEqual([0, 50, 100])
  })

  it('excludes a response with an excluded dispute', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'peer_coach', submitted_at: '2026-08-14T00:00:00Z' }]
    state.answers = [{ numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } }]
    state.excludedResponseIds = ['resp-1']
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    expect(result).toEqual({})
  })

  it('groups multiple responses for the same category+source into one SourceInput', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'peer_coach', submitted_at: '2026-08-14T00:00:00Z' },
      { id: 'resp-2', respondent_type: 'peer_coach', submitted_at: '2026-08-15T00:00:00Z' },
    ]
    state.answers = [
      { numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 5, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'teacher' } } },
    ]
    const result = await fetchBlendInputs(makeClient() as never, 'coach-1')
    expect(result.teacher).toHaveLength(1)
    expect(result.teacher[0].responses).toHaveLength(2)
  })
})

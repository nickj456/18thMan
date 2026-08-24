// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'

const state: {
  requestIds: string[]
  responses: { id: string; respondent_type: string }[]
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

import { computeFeedbackSummary } from './feedback-summary'

describe('computeFeedbackSummary', () => {
  beforeEach(() => {
    state.requestIds = ['req-1']
    state.responses = []
    state.answers = []
    state.excludedResponseIds = []
  })

  it('returns both sections not-ready when there are no feedback requests', async () => {
    state.requestIds = []
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice).toEqual({ ready: false, responseCount: 0, categories: [] })
    expect(result.peerObservation).toEqual({ ready: false, responseCount: 0, categories: [] })
  })

  it('returns both sections not-ready when there are no responses', async () => {
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.peerObservation.ready).toBe(false)
  })

  it('withholds a category below its threshold (2 player responses, threshold 3)', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'player' },
      { id: 'resp-2', respondent_type: 'player' },
    ]
    state.answers = [
      { numeric_value: 4, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 5, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'teacher' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.playerParentVoice.categories).toEqual([])
  })

  it('combines player + parent responses toward the Player / Parent Voice threshold', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'player' },
      { id: 'resp-2', respondent_type: 'player' },
      { id: 'resp-3', respondent_type: 'parent' },
    ]
    state.answers = [
      { numeric_value: 4, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 4, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 4, feedback_response_id: 'resp-3', question_id: 'q3', assessment_questions: { dna_categories: { slug: 'teacher' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice.ready).toBe(true)
    expect(result.playerParentVoice.categories).toEqual([{ categorySlug: 'teacher', averageRating: 4, responseCount: 3 }])
    expect(result.playerParentVoice.responseCount).toBe(3)
  })

  it('clears Peer Observation at a single response (threshold 1)', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'peer_coach' }]
    state.answers = [
      { numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.ready).toBe(true)
    expect(result.peerObservation.categories).toEqual([{ categorySlug: 'organiser', averageRating: 3, responseCount: 1 }])
  })

  it('computes a plain arithmetic mean across multiple answers in the same category', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'peer_coach' }]
    state.answers = [
      { numeric_value: 2, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
      { numeric_value: 5, feedback_response_id: 'resp-1', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.categories[0].averageRating).toBe(3.5)
  })

  it('excludes a response with an excluded dispute from both the average and the response count', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'peer_coach' },
      { id: 'resp-2', respondent_type: 'peer_coach' },
    ]
    state.answers = [
      { numeric_value: 1, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
      { numeric_value: 5, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    state.excludedResponseIds = ['resp-1']
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.categories).toEqual([{ categorySlug: 'organiser', averageRating: 5, responseCount: 1 }])
    expect(result.peerObservation.responseCount).toBe(1)
  })

  it('keeps Player/Parent Voice and Peer Observation as independent sections', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'peer_coach' },
    ]
    state.answers = [
      { numeric_value: 4, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.ready).toBe(true)
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.playerParentVoice.categories).toEqual([])
  })
})

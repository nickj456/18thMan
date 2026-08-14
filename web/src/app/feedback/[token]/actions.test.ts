// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Question = { id: string; question_format: string }

const state: {
  request: { id: string; feedback_type: 'player_voice' | 'peer_observation'; status: 'active' | 'paused' | 'expired'; expires_at: string } | null
  questions: Question[]
  existingResponseId: string | null
  insertResponseError: { message: string; code?: string } | null
  insertAnswersError: { message: string } | null
  insertFlagError: { message: string } | null
  safeguardingFlagged: boolean
  throwOnRequestLookup: boolean
} = {
  request: null,
  questions: [],
  existingResponseId: null,
  insertResponseError: null,
  insertAnswersError: null,
  insertFlagError: null,
  safeguardingFlagged: false,
  throwOnRequestLookup: false,
}

const insertResponseMock = vi.fn()
const insertAnswersMock = vi.fn()
const insertFlagMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: state.insertFlagError }))
const updateHeldMock = vi.fn()
const checkSafeguardingConcernMock = vi.fn(async (_text: string) => state.safeguardingFlagged)

vi.mock('@/lib/coach-dna/safeguarding', () => ({
  checkSafeguardingConcern: (text: string) => checkSafeguardingConcernMock(text),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'feedback_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (state.throwOnRequestLookup) throw new Error('unexpected db error')
                return { data: state.request }
              },
            }),
          }),
        }
      }
      if (table === 'assessment_questions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: state.questions }),
              }),
            }),
          }),
        }
      }
      if (table === 'feedback_responses') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.existingResponseId ? { id: state.existingResponseId } : null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                insertResponseMock(row)
                if (state.insertResponseError) return { data: null, error: state.insertResponseError }
                return { data: { id: 'response-1' }, error: null }
              },
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updateHeldMock(patch)
              return { error: null }
            },
          }),
        }
      }
      if (table === 'feedback_answers') {
        return {
          insert: (rows: Record<string, unknown>[]) => ({
            select: async () => {
              insertAnswersMock(rows)
              if (state.insertAnswersError) return { data: null, error: state.insertAnswersError }
              return { data: rows.map((r, i) => ({ id: `answer-${i}`, question_id: r.question_id })), error: null }
            },
          }),
        }
      }
      if (table === 'safeguarding_flags') {
        return { insert: (row: Record<string, unknown>) => insertFlagMock(row) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { submitFeedbackResponse } from './actions'

const RATING_QUESTIONS: Question[] = Array.from({ length: 8 }, (_, i) => ({ id: `q${i + 1}`, question_format: 'rating_scale' }))
const FREE_TEXT_QUESTION: Question = { id: 'qft', question_format: 'free_text' }
const ALL_QUESTIONS = [...RATING_QUESTIONS, FREE_TEXT_QUESTION]

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

function allRatings(value = '4'): Record<string, string> {
  return Object.fromEntries(RATING_QUESTIONS.map(q => [`rating-${q.id}`, value]))
}

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

describe('submitFeedbackResponse', () => {
  beforeEach(() => {
    state.request = { id: 'req-1', feedback_type: 'peer_observation', status: 'active', expires_at: FUTURE }
    state.questions = ALL_QUESTIONS
    state.existingResponseId = null
    state.insertResponseError = null
    state.insertAnswersError = null
    state.insertFlagError = null
    state.safeguardingFlagged = false
    state.throwOnRequestLookup = false
    insertResponseMock.mockClear()
    insertAnswersMock.mockClear()
    insertFlagMock.mockClear()
    updateHeldMock.mockClear()
    checkSafeguardingConcernMock.mockClear()
  })

  it('rejects when the token does not resolve to a request', async () => {
    state.request = null
    const result = await submitFeedbackResponse('bad-token', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'This feedback link is no longer valid.' })
  })

  it('rejects an expired request', async () => {
    state.request!.expires_at = PAST
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'This feedback request has expired.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('rejects a paused request', async () => {
    state.request!.status = 'paused'
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'This coach is not currently accepting feedback on this link.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('peer_observation: submits successfully with no comment, respondentType always peer_coach', async () => {
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ success: true })
    expect(insertResponseMock).toHaveBeenCalledWith(expect.objectContaining({ respondent_type: 'peer_coach', held_for_review: true }))
    expect(updateHeldMock).toHaveBeenCalledWith({ held_for_review: false })
    expect(checkSafeguardingConcernMock).not.toHaveBeenCalled()
  })

  it('player_voice: rejects when respondentType is missing', async () => {
    state.request!.feedback_type = 'player_voice'
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'Please select whether you are the player or a parent.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('player_voice: submits successfully with respondentType parent', async () => {
    state.request!.feedback_type = 'player_voice'
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), respondentType: 'parent' }))
    expect(result).toEqual({ success: true })
    expect(insertResponseMock).toHaveBeenCalledWith(expect.objectContaining({ respondent_type: 'parent' }))
  })

  it('rejects when a rating is missing', async () => {
    const ratings = allRatings()
    delete (ratings as Record<string, string>)['rating-q8']
    const result = await submitFeedbackResponse('token-1', {}, formData(ratings))
    expect(result).toEqual({ error: 'Please rate every statement before submitting.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range rating', async () => {
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), 'rating-q1': '6' }))
    expect(result).toEqual({ error: 'Please rate every statement before submitting.' })
  })

  it('rejects a duplicate submission from the same device', async () => {
    state.existingResponseId = 'existing-response'
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: "You've already submitted feedback for this request." })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('returns the same friendly duplicate message when the unique-constraint catches a lost race (not a generic error)', async () => {
    // Simulates two concurrent submissions from the same device both passing
    // the pre-insert existence check before either insert lands -- the
    // second insert hits the (feedback_request_id, device_fingerprint_hash)
    // unique constraint (119) and returns a 23505.
    state.insertResponseError = { message: 'duplicate key value violates unique constraint', code: '23505' }
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: "You've already submitted feedback for this request." })
  })

  it('a clean comment flips held_for_review to false and never creates a safeguarding flag', async () => {
    state.safeguardingFlagged = false
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), comment: 'Great coach!' }))
    expect(result).toEqual({ success: true })
    expect(checkSafeguardingConcernMock).toHaveBeenCalledWith('Great coach!')
    expect(updateHeldMock).toHaveBeenCalledWith({ held_for_review: false })
    expect(insertFlagMock).not.toHaveBeenCalled()
  })

  it('a flagged comment creates a safeguarding_flags row and leaves the response held', async () => {
    state.safeguardingFlagged = true
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), comment: 'concerning text' }))
    expect(result).toEqual({ success: true })
    expect(insertFlagMock).toHaveBeenCalledWith(
      expect.objectContaining({ flagged_text: 'concerning text', detection_method: 'automated', feedback_answer_id: 'answer-8' }),
    )
    expect(updateHeldMock).not.toHaveBeenCalled()
  })

  it('returns a generic error when the response insert fails', async () => {
    state.insertResponseError = { message: 'db down' }
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'Something went wrong submitting your feedback. Please try again.' })
  })

  it('returns a generic error when the answers insert fails', async () => {
    state.insertAnswersError = { message: 'db down' }
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'Something went wrong submitting your feedback. Please try again.' })
  })

  it('still succeeds when the safeguarding_flags insert fails, without blocking the submission', async () => {
    state.safeguardingFlagged = true
    state.insertFlagError = { message: 'db down' }
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), comment: 'concerning text' }))
    expect(result).toEqual({ success: true })
    expect(updateHeldMock).not.toHaveBeenCalled()
  })

  it('returns a generic error instead of throwing when an unexpected exception occurs', async () => {
    state.throwOnRequestLookup = true
    await expect(submitFeedbackResponse('token-1', {}, formData(allRatings()))).resolves.toEqual({
      error: 'Something went wrong submitting your feedback. Please try again.',
    })
  })
})

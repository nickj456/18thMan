// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  orderedQuestionIds: string[]
  answeredQuestionIds: string[]
  incompleteQuestionIds: string[]
  upsertError: { message: string } | null
  completeError: { message: string } | null
  matchingOptionIds: string[]
  questionsError: { message: string } | null
  responsesError: { message: string } | null
} = {
  user: null,
  role: null,
  attempt: null,
  orderedQuestionIds: [],
  answeredQuestionIds: [],
  incompleteQuestionIds: [],
  upsertError: null,
  completeError: null,
  matchingOptionIds: ['opt-most', 'opt-least'],
  questionsError: null,
  responsesError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const updateMock = vi.fn(() => ({ eq: async () => ({ error: state.completeError }) }))
const revalidateMock = vi.fn()
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
      }
      if (table === 'assessment_attempts') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }),
          update: updateMock,
        }
      }
      if (table === 'assessment_options') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: state.matchingOptionIds.map(id => ({ id })) }),
            }),
          }),
        }
      }
      if (table === 'assessment_questions') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: state.orderedQuestionIds.map(id => ({ id })), error: state.questionsError }),
            }),
          }),
        }
      }
      if (table === 'assessment_responses') {
        return {
          select: () => ({
            eq: async () => ({
              data: state.answeredQuestionIds.map(id => ({
                question_id: id,
                selected_option: 'opt-most',
                least_option: state.incompleteQuestionIds.includes(id) ? null : 'opt-least',
              })),
              error: state.responsesError,
            }),
          }),
          upsert: upsertMock,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { answerQuestion } from './actions'

describe('answerQuestion', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    state.orderedQuestionIds = ['q1', 'q2', 'q3']
    state.answeredQuestionIds = []
    state.incompleteQuestionIds = []
    state.upsertError = null
    state.completeError = null
    state.matchingOptionIds = ['opt-most', 'opt-least']
    state.questionsError = null
    state.responsesError = null
    upsertMock.mockClear()
    updateMock.mockClear()
    revalidateMock.mockClear()
    redirectMock.mockClear()
  })

  it('rejects identical most and least picks without writing a response', async () => {
    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-most')).rejects.toThrow(
      'Most and least picks must be different options',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('saves both picks in one upsert', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:')

    expect(upsertMock).toHaveBeenCalledWith(
      { attempt_id: 'attempt-1', question_id: 'q1', selected_option: 'opt-most', least_option: 'opt-least' },
      { onConflict: 'attempt_id,question_id' },
    )
  })

  it('revalidates the assessment route so a revisited question shows the freshly saved answer', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:')

    expect(revalidateMock).toHaveBeenCalledWith('/admin/coach-dna/assessment/attempt-1')
  })

  it('redirects to the next unanswered question when the attempt is incomplete', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1?q=q2',
    )
  })

  it('marks the attempt complete and redirects to the completion screen on the last question', async () => {
    state.answeredQuestionIds = ['q1', 'q2', 'q3']

    await expect(answerQuestion('attempt-1', 'q3', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1/complete',
    )
    expect(updateMock).toHaveBeenCalledWith({ completed_at: expect.any(String) })
  })

  it('rejects answering an attempt that belongs to a different coach', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: null }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects to the completion screen instead of mutating an already-completed attempt', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-01T00:00:00.000Z' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1/complete',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated callers to login without writing a response', async () => {
    state.user = null

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/login')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'
    state.answeredQuestionIds = ['q1']

    // answerQuestion redirects to the next question on success, so the
    // mocked redirect() throw is the expected outcome here (matches this
    // file's existing 'saves both picks in one upsert' test pattern) — this
    // only proves the role check let the call reach the upsert.
    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:')
    expect(upsertMock).toHaveBeenCalled()
  })

  it('redirects non-coach, non-admin callers to the dashboard without writing a response', async () => {
    state.role = 'viewer'

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects to Coach DNA home when the attempt does not exist', async () => {
    state.attempt = null

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/admin/coach-dna')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects when one or both options do not belong to the given question', async () => {
    state.matchingOptionIds = ['opt-most'] // only one of the two resolves

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-from-another-question')).rejects.toThrow(
      'Selected options do not belong to this question',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when saving the response fails', async () => {
    state.upsertError = { message: 'upsert failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('upsert failed')
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('throws instead of silently completing the attempt when the questions query errors', async () => {
    state.questionsError = { message: 'questions query failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('questions query failed')
    expect(updateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining('/complete'))
  })

  it('throws instead of silently completing the attempt when the responses query errors', async () => {
    state.responsesError = { message: 'responses query failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('responses query failed')
    expect(updateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining('/complete'))
  })

  it('does not treat a response with a missing least_option as answered, so the attempt is not completed', async () => {
    // q1 and q2 have both picks saved; q3's existing row is missing `least_option`
    // (pre-migration / partially-saved). Answering q3 now should NOT be treated
    // as completing the attempt — q3 must still count as unanswered until the
    // upsert lands, so the "is complete" check re-derives from a fresh read that
    // requires both selected_option and least_option to be non-null.
    state.answeredQuestionIds = ['q1', 'q2', 'q3']
    state.incompleteQuestionIds = ['q3']

    await expect(answerQuestion('attempt-1', 'q2', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1?q=q3',
    )
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('throws when marking the attempt complete fails', async () => {
    state.answeredQuestionIds = ['q1', 'q2', 'q3']
    state.completeError = { message: 'update failed' }

    await expect(answerQuestion('attempt-1', 'q3', 'opt-most', 'opt-least')).rejects.toThrow('update failed')
  })
})

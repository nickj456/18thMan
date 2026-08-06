// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  orderedQuestionIds: string[]
  answeredQuestionIds: string[]
  upsertError: { message: string } | null
  completeError: { message: string } | null
  optionBelongsToQuestion: boolean
  questionsError: { message: string } | null
  responsesError: { message: string } | null
} = {
  user: null,
  role: null,
  attempt: null,
  orderedQuestionIds: [],
  answeredQuestionIds: [],
  upsertError: null,
  completeError: null,
  optionBelongsToQuestion: true,
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
              eq: () => ({
                maybeSingle: async () => ({ data: state.optionBelongsToQuestion ? { id: 'opt-1' } : null }),
              }),
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
              data: state.answeredQuestionIds.map(id => ({ question_id: id })),
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
    state.upsertError = null
    state.completeError = null
    state.optionBelongsToQuestion = true
    state.questionsError = null
    state.responsesError = null
    upsertMock.mockClear()
    updateMock.mockClear()
    revalidateMock.mockClear()
    redirectMock.mockClear()
  })

  it('revalidates the assessment route so a revisited question shows the freshly saved answer', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('REDIRECT:')

    expect(revalidateMock).toHaveBeenCalledWith('/admin/coach-dna/assessment/attempt-1')
  })

  it('redirects to the next unanswered question when the attempt is incomplete', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1?q=q2',
    )
  })

  it('marks the attempt complete and redirects to the completion screen on the last question', async () => {
    state.answeredQuestionIds = ['q1', 'q2', 'q3']

    await expect(answerQuestion('attempt-1', 'q3', 'opt-1')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1/complete',
    )
    expect(updateMock).toHaveBeenCalledWith({ completed_at: expect.any(String) })
  })

  it('rejects answering an attempt that belongs to a different coach', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: null }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects to the completion screen instead of mutating an already-completed attempt', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-01T00:00:00.000Z' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1/complete',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated callers to login without writing a response', async () => {
    state.user = null

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('REDIRECT:/login')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects non-admin callers to the dashboard without writing a response', async () => {
    state.role = 'coach'

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects to Coach DNA home when the attempt does not exist', async () => {
    state.attempt = null

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('REDIRECT:/admin/coach-dna')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects an option that does not belong to the given question', async () => {
    state.optionBelongsToQuestion = false

    await expect(answerQuestion('attempt-1', 'q1', 'opt-from-another-question')).rejects.toThrow(
      'Selected option does not belong to this question',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when saving the response fails', async () => {
    state.upsertError = { message: 'upsert failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('upsert failed')
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('throws instead of silently completing the attempt when the questions query errors', async () => {
    state.questionsError = { message: 'questions query failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('questions query failed')
    expect(updateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining('/complete'))
  })

  it('throws instead of silently completing the attempt when the responses query errors', async () => {
    state.responsesError = { message: 'responses query failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow('responses query failed')
    expect(updateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining('/complete'))
  })

  it('throws when marking the attempt complete fails', async () => {
    state.answeredQuestionIds = ['q1', 'q2', 'q3']
    state.completeError = { message: 'update failed' }

    await expect(answerQuestion('attempt-1', 'q3', 'opt-1')).rejects.toThrow('update failed')
  })
})

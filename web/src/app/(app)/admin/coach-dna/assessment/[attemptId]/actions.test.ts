// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string } | null
  orderedQuestionIds: string[]
  answeredQuestionIds: string[]
  upsertError: { message: string } | null
} = {
  user: null,
  role: null,
  attempt: null,
  orderedQuestionIds: [],
  answeredQuestionIds: [],
  upsertError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const updateMock = vi.fn(() => ({ eq: async () => ({ error: null }) }))
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
      if (table === 'assessment_questions') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: state.orderedQuestionIds.map(id => ({ id })) }),
            }),
          }),
        }
      }
      if (table === 'assessment_responses') {
        return {
          select: () => ({
            eq: async () => ({ data: state.answeredQuestionIds.map(id => ({ question_id: id })) }),
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
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1' }
    state.orderedQuestionIds = ['q1', 'q2', 'q3']
    state.answeredQuestionIds = []
    state.upsertError = null
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
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-1')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })
})

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  insertError: { message: string } | null
  insertedAttempt: { id: string } | null
  lastCompletedAt: string | null
  lastCompletedError: { message: string } | null
  existingInProgress: { id: string } | null
} = {
  user: null,
  role: null,
  insertError: null,
  insertedAttempt: null,
  lastCompletedAt: null,
  lastCompletedError: null,
  existingInProgress: null,
}

// startAssessment issues two `.select()` queries against assessment_attempts,
// in order: (1) the most recently completed attempt, used for the eligibility
// check, then (2) any existing in-progress attempt. Track which one a given
// `.select()` call corresponds to via call order, same approach as
// page.test.tsx's assessmentAttemptCall.
let assessmentSelectCall = 0

const insertMock = vi.fn(() => ({
  select: () => ({
    single: async () => ({ data: state.insertedAttempt, error: state.insertError }),
  }),
}))
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))

function makeAssessmentSelectBuilder() {
  assessmentSelectCall += 1
  const call = assessmentSelectCall
  const builder = {
    eq: () => builder,
    not: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      if (call === 1) {
        return {
          data: state.lastCompletedAt ? { completed_at: state.lastCompletedAt } : null,
          error: state.lastCompletedError,
        }
      }
      return { data: state.existingInProgress, error: null }
    },
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
      }
      if (table === 'assessment_attempts') {
        return {
          insert: insertMock,
          select: () => makeAssessmentSelectBuilder(),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { startAssessment } from './actions'

describe('startAssessment', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.insertError = null
    state.insertedAttempt = { id: 'attempt-1' }
    state.lastCompletedAt = null
    state.lastCompletedError = null
    state.existingInProgress = null
    assessmentSelectCall = 0
    insertMock.mockClear()
    redirectMock.mockClear()
  })

  it('redirects unauthenticated callers to login without creating an attempt', async () => {
    state.user = null

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/login')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'

    // startAssessment redirects to the new attempt on success, so the mocked
    // redirect() throw is the expected outcome here, not a plain return —
    // this only proves the role check let the call reach the insert.
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('redirects non-coach, non-admin callers to the dashboard without creating an attempt', async () => {
    state.role = 'viewer'

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('throws when the attempt insert fails', async () => {
    state.insertError = { message: 'insert failed' }
    state.insertedAttempt = null

    await expect(startAssessment()).rejects.toThrow('insert failed')
  })

  it('throws a fallback error when insert returns no error and no attempt', async () => {
    state.insertError = null
    state.insertedAttempt = null

    await expect(startAssessment()).rejects.toThrow('Failed to start assessment')
  })

  it('creates an attempt and redirects to the assessment for a valid admin', async () => {
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalledWith({ coach_id: 'coach-1', assessment_type: 'self_assessment', version: 1 })
  })

  it('allows a first-time start with no prior completed attempt', async () => {
    state.lastCompletedAt = null

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('rejects a retake attempt within the 3-month cooldown, without creating an attempt', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    state.lastCompletedAt = yesterday.toISOString()

    await expect(startAssessment()).rejects.toThrow('You are not yet eligible to retake this assessment')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a retake once the 3-month cooldown has passed', async () => {
    const fourMonthsAgo = new Date()
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)
    state.lastCompletedAt = fourMonthsAgo.toISOString()

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('fails closed and throws when the eligibility lookup errors, instead of treating it as never-completed', async () => {
    state.lastCompletedError = { message: 'connection reset' }

    await expect(startAssessment()).rejects.toThrow('connection reset')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('redirects to an already-existing in-progress attempt instead of creating a duplicate', async () => {
    const fourMonthsAgo = new Date()
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)
    state.lastCompletedAt = fourMonthsAgo.toISOString()
    state.existingInProgress = { id: 'in-progress-1' }

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/in-progress-1')
    expect(insertMock).not.toHaveBeenCalled()
  })
})

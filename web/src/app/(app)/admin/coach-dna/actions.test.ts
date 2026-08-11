// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  insertError: { message: string } | null
  insertedAttempt: { id: string } | null
} = {
  user: null,
  role: null,
  insertError: null,
  insertedAttempt: null,
}

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
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
      }
      if (table === 'assessment_attempts') {
        return { insert: insertMock }
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
})

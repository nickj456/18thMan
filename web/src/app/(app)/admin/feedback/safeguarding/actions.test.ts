// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  clubRole: string | null
  updateFlagError: { message: string } | null
  updateResponseError: { message: string } | null
  logError: { message: string } | null
} = {
  user: null,
  role: null,
  clubRole: null,
  updateFlagError: null,
  updateResponseError: null,
  logError: null,
}

const updateFlagMock = vi.fn()
const updateResponseMock = vi.fn()
const insertLogMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: state.logError }))
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/navigation', () => ({ redirect: (path: string) => redirectMock(path) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role, club_role: state.clubRole } }) }) }) }
      }
      if (table === 'safeguarding_flags') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'flag-1', feedback_answer_id: 'answer-1' } }) }) }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updateFlagMock(patch)
              return { error: state.updateFlagError }
            },
          }),
        }
      }
      if (table === 'feedback_answers') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { feedback_response_id: 'response-1' } }) }) }) }
      }
      if (table === 'feedback_responses') {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updateResponseMock(patch)
              return { error: state.updateResponseError }
            },
          }),
        }
      }
      if (table === 'admin_feedback_access_log') {
        return { insert: (row: Record<string, unknown>) => insertLogMock(row) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { dismissSafeguardingFlag, confirmSafeguardingFlag } from './actions'

describe('safeguarding queue actions', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.clubRole = null
    state.updateFlagError = null
    state.updateResponseError = null
    state.logError = null
    updateFlagMock.mockClear()
    updateResponseMock.mockClear()
    insertLogMock.mockClear()
  })

  describe('dismissSafeguardingFlag', () => {
    it('rejects a non-moderator caller', async () => {
      state.role = 'coach'
      state.clubRole = null
      await expect(dismissSafeguardingFlag('flag-1')).rejects.toThrow('REDIRECT:/dashboard')
      expect(updateFlagMock).not.toHaveBeenCalled()
    })

    it('sets status dismissed with reviewed_by/reviewed_at, never touches flagged_text', async () => {
      await dismissSafeguardingFlag('flag-1')
      expect(updateFlagMock).toHaveBeenCalledTimes(1)
      const patch = updateFlagMock.mock.calls[0][0]
      expect(patch).toMatchObject({ status: 'dismissed', reviewed_by: 'admin-1' })
      expect(patch).toHaveProperty('reviewed_at')
      expect(patch).not.toHaveProperty('flagged_text')
      expect(patch).not.toHaveProperty('detection_method')
      expect(patch).not.toHaveProperty('feedback_answer_id')
    })

    it('releases the underlying response (held_for_review: false)', async () => {
      await dismissSafeguardingFlag('flag-1')
      expect(updateResponseMock).toHaveBeenCalledWith({ held_for_review: false })
    })

    it('writes an admin_feedback_access_log row with action dismiss_safeguarding_flag', async () => {
      await dismissSafeguardingFlag('flag-1')
      expect(insertLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ admin_id: 'admin-1', feedback_response_id: 'response-1', action: 'dismiss_safeguarding_flag' }),
      )
    })
  })

  describe('confirmSafeguardingFlag', () => {
    it('rejects a non-moderator caller', async () => {
      state.role = 'coach'
      state.clubRole = null
      await expect(confirmSafeguardingFlag('flag-1')).rejects.toThrow('REDIRECT:/dashboard')
      expect(updateFlagMock).not.toHaveBeenCalled()
    })

    it('sets status reviewed with reviewed_by/reviewed_at, never touches flagged_text', async () => {
      await confirmSafeguardingFlag('flag-1')
      const patch = updateFlagMock.mock.calls[0][0]
      expect(patch).toMatchObject({ status: 'reviewed', reviewed_by: 'admin-1' })
      expect(patch).not.toHaveProperty('flagged_text')
    })

    it('does NOT touch held_for_review on the response', async () => {
      await confirmSafeguardingFlag('flag-1')
      expect(updateResponseMock).not.toHaveBeenCalled()
    })

    it('writes an admin_feedback_access_log row with action confirm_safeguarding_flag', async () => {
      await confirmSafeguardingFlag('flag-1')
      expect(insertLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'confirm_safeguarding_flag' }),
      )
    })
  })
})

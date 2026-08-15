// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  clubRole: string | null
  disputeStatus: string
  updateError: { message: string } | null
} = {
  user: null,
  role: null,
  clubRole: null,
  disputeStatus: 'open',
  updateError: null,
}

const updateMock = vi.fn()
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
      if (table === 'response_disputes') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'dispute-1', status: state.disputeStatus } }) }) }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: async () => {
                updateMock(patch)
                return { error: state.updateError, count: state.updateError ? 0 : 1 }
              },
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { resolveDispute } from './actions'

describe('resolveDispute', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.clubRole = null
    state.disputeStatus = 'open'
    state.updateError = null
    updateMock.mockClear()
  })

  it('rejects a non-moderator caller', async () => {
    state.role = 'coach'
    await expect(resolveDispute('dispute-1', 'excluded')).rejects.toThrow('REDIRECT:/dashboard')
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('resolves to excluded, setting resolved_by/resolved_at', async () => {
    const result = await resolveDispute('dispute-1', 'excluded')
    expect(result).toEqual({ success: true })
    const patch = updateMock.mock.calls[0][0]
    expect(patch).toMatchObject({ status: 'excluded', resolved_by: 'admin-1' })
    expect(patch).toHaveProperty('resolved_at')
  })

  it('resolves to no_action', async () => {
    const result = await resolveDispute('dispute-1', 'no_action')
    expect(result).toEqual({ success: true })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ status: 'no_action' })
  })

  it('rejects resolving a dispute that is not currently open', async () => {
    state.disputeStatus = 'excluded'
    const result = await resolveDispute('dispute-1', 'no_action')
    expect(result.error).toBeTruthy()
    expect(updateMock).not.toHaveBeenCalled()
  })
})

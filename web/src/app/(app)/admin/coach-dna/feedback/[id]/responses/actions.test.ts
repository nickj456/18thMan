// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  insertError: { message: string; code?: string } | null
} = {
  user: null,
  role: null,
  insertError: null,
}

const insertMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: state.insertError }))
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
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
      }
      if (table === 'response_disputes') {
        return { insert: (row: Record<string, unknown>) => insertMock(row) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { raiseDispute } from './actions'

describe('raiseDispute', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'coach'
    state.insertError = null
    insertMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(raiseDispute('response-1', 'This seems unfair')).rejects.toThrow('REDIRECT:/login')
  })

  it('creates a dispute with raised_by set to the caller and status open', async () => {
    const result = await raiseDispute('response-1', 'This seems unfair')
    expect(result).toEqual({ success: true })
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedback_response_id: 'response-1', raised_by: 'coach-1', reason: 'This seems unfair', status: 'open' }),
    )
  })

  it('rejects an empty reason without hitting the database', async () => {
    const result = await raiseDispute('response-1', '   ')
    expect(result.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('returns a friendly message for a duplicate dispute on the same response (23505)', async () => {
    state.insertError = { message: 'duplicate key value violates unique constraint', code: '23505' }
    const result = await raiseDispute('response-1', 'This seems unfair')
    expect(result).toEqual({ error: "You've already disputed this response." })
  })

  it('returns a friendly not-found message when RLS rejects the insert (not the caller\'s own request)', async () => {
    state.insertError = { message: 'new row violates row-level security policy for table "response_disputes"', code: '42501' }
    const result = await raiseDispute('response-1', 'This seems unfair')
    expect(result).toEqual({ error: 'Could not raise a dispute for this response.' })
  })
})

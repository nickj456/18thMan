// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  insertError: { message: string } | null
} = { user: null, insertError: null }

const insertMock = vi.fn(async () => ({ error: state.insertError }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({ insert: insertMock }),
  }),
}))

import { POST } from './route'

function request(body: unknown): Request {
  return {
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input')
      return body
    },
  } as unknown as Request
}

describe('POST /api/track-page-view', () => {
  beforeEach(() => {
    state.user = { id: 'user-1' }
    state.insertError = null
    insertMock.mockClear()
  })

  it('returns 400 for a malformed body', async () => {
    const res = await POST(request(undefined))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('returns 400 when path is missing or not a string', async () => {
    const res = await POST(request({ path: 42 }))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('no-ops with 204 when there is no authenticated user', async () => {
    state.user = null
    const res = await POST(request({ path: '/dashboard' }))
    expect(res.status).toBe(204)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts a page_views row scoped to the current user and returns 204', async () => {
    const res = await POST(request({ path: '/drills' }))
    expect(res.status).toBe(204)
    expect(insertMock).toHaveBeenCalledWith({ path: '/drills', user_id: 'user-1' })
  })

  it('still returns 204 if the insert itself fails (best-effort tracking)', async () => {
    state.insertError = { message: 'db unreachable' }
    const res = await POST(request({ path: '/drills' }))
    expect(res.status).toBe(204)
  })
})

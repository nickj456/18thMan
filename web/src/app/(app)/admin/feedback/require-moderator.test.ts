// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  clubRole: string | null
} = {
  user: null,
  role: null,
  clubRole: null,
}

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
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role, club_role: state.clubRole } }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { requireFeedbackModerator } from './require-moderator'

describe('requireFeedbackModerator', () => {
  beforeEach(() => {
    state.user = null
    state.role = null
    state.clubRole = null
    redirectMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    await expect(requireFeedbackModerator()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects a plain coach (no club admin, no platform admin) to the dashboard', async () => {
    state.user = { id: 'coach-1' }
    state.role = 'coach'
    state.clubRole = null
    await expect(requireFeedbackModerator()).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('allows a club admin through with isPlatformAdmin: false', async () => {
    state.user = { id: 'coach-1' }
    state.role = 'coach'
    state.clubRole = 'admin'
    const result = await requireFeedbackModerator()
    expect(result.isPlatformAdmin).toBe(false)
    expect(result.userId).toBe('coach-1')
  })

  it('allows a platform admin through with isPlatformAdmin: true, even with no club', async () => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.clubRole = null
    const result = await requireFeedbackModerator()
    expect(result.isPlatformAdmin).toBe(true)
    expect(result.userId).toBe('admin-1')
  })
})

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  clubId: string | null
  clubRole: string | null
  insertError: { message: string; code?: string } | null
} = {
  user: null,
  clubId: null,
  clubRole: null,
  insertError: null,
}

const insertMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: state.insertError }))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { club_id: state.clubId, club_role: state.clubRole } }) }) }) }
      }
      if (table === 'club_guardian_consents') {
        return { insert: (row: Record<string, unknown>) => insertMock(row) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { grantGuardianConsent } from './actions'

describe('grantGuardianConsent', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.clubId = 'club-1'
    state.clubRole = 'admin'
    state.insertError = null
    insertMock.mockClear()
  })

  it('rejects when the caller is not authenticated', async () => {
    state.user = null
    const result = await grantGuardianConsent('club-1')
    expect(result).toEqual({ error: 'Not authenticated' })
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects when the caller is not an admin of this club', async () => {
    state.clubRole = 'member'
    const result = await grantGuardianConsent('club-1')
    expect(result.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects when the caller is an admin of a different club', async () => {
    state.clubId = 'club-2'
    const result = await grantGuardianConsent('club-1')
    expect(result.error).toBeTruthy()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts a club_guardian_consents row with granted_by set to the caller', async () => {
    const result = await grantGuardianConsent('club-1')
    expect(result).toEqual({ success: true })
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ club_id: 'club-1', granted_by: 'admin-1' }),
    )
    expect(insertMock.mock.calls[0][0]).toHaveProperty('season_label')
  })

  it('treats an already-granted consent (23505) as success, not an error', async () => {
    state.insertError = { message: 'duplicate key value violates unique constraint', code: '23505' }
    const result = await grantGuardianConsent('club-1')
    expect(result).toEqual({ success: true, alreadyGranted: true })
  })

  it('surfaces a genuine insert failure as an error', async () => {
    state.insertError = { message: 'db down' }
    const result = await grantGuardianConsent('club-1')
    expect(result).toEqual({ error: 'db down' })
  })
})

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Table-keyed responses let each test script what the service client returns
// for the clubs and profiles lookups without a real Supabase connection.
const responses: Record<string, { data: unknown }> = {}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => responses[table] ?? { data: null },
        }),
      }),
    }),
  }),
}))

import { isClubAdmin } from './clubs'

describe('isClubAdmin', () => {
  beforeEach(() => {
    delete responses.clubs
    delete responses.profiles
  })

  it('returns false for missing userId or clubId', async () => {
    expect(await isClubAdmin('', 'club-1')).toBe(false)
    expect(await isClubAdmin('user-1', '')).toBe(false)
  })

  it('returns false when the club does not exist', async () => {
    responses.clubs = { data: null }
    expect(await isClubAdmin('user-1', 'club-1')).toBe(false)
  })

  it('returns true for the club creator', async () => {
    responses.clubs = { data: { created_by: 'user-1' } }
    expect(await isClubAdmin('user-1', 'club-1')).toBe(true)
  })

  it('returns true for a profile that is admin of that club', async () => {
    responses.clubs = { data: { created_by: 'someone-else' } }
    responses.profiles = { data: { club_id: 'club-1', club_role: 'admin' } }
    expect(await isClubAdmin('user-1', 'club-1')).toBe(true)
  })

  it('returns false for an admin of a different club (the IDOR case)', async () => {
    responses.clubs = { data: { created_by: 'someone-else' } }
    responses.profiles = { data: { club_id: 'other-club', club_role: 'admin' } }
    expect(await isClubAdmin('user-1', 'club-1')).toBe(false)
  })

  it('returns false for a non-admin member of the club', async () => {
    responses.clubs = { data: { created_by: 'someone-else' } }
    responses.profiles = { data: { club_id: 'club-1', club_role: 'coach' } }
    expect(await isClubAdmin('user-1', 'club-1')).toBe(false)
  })
})

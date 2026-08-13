// web/src/app/(app)/admin/coach-dna/feedback/actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  clubId: string | null
  teamCreatedBy: string | null
  teamInviteAccepted: boolean
  consentRow: { id: string } | null
  insertError: { message: string } | null
} = {
  user: null,
  role: 'coach',
  clubId: null,
  teamCreatedBy: null,
  teamInviteAccepted: false,
  consentRow: null,
  insertError: null,
}

const insertMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: state.insertError }))
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))
vi.mock('crypto', () => ({
  randomUUID: () => 'fake-token-uuid',
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.role === null ? null : { role: state.role, club_id: state.clubId } }),
            }),
          }),
        }
      }
      if (table === 'coaching_groups') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.teamCreatedBy ? { id: 'team-1' } : null }),
              }),
            }),
          }),
        }
      }
      if (table === 'group_invitations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: state.teamInviteAccepted ? { id: 'invite-1' } : null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'club_guardian_consents') {
        // Note: this mock bypasses RLS entirely, so it does not prove the
        // consent read succeeds for non-admin club members under real
        // Postgres policies. That coverage lives in the migration itself
        // (supabase/migrations/116_club_guardian_consents_member_select.sql).
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.consentRow }),
              }),
            }),
          }),
        }
      }
      if (table === 'feedback_requests') {
        return { insert: insertMock }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { createFeedbackRequest } from './actions'

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('createFeedbackRequest', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'coach'
    state.clubId = 'club-1'
    state.teamCreatedBy = null
    state.teamInviteAccepted = false
    state.consentRow = null
    state.insertError = null
    insertMock.mockClear()
    redirectMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects viewer-role callers to the dashboard', async () => {
    state.role = 'viewer'
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid feedback type', async () => {
    await expect(createFeedbackRequest(formData({ feedbackType: 'nonsense' }))).rejects.toThrow('Invalid feedback type')
  })

  it('creates a peer_observation request without any team or consent check', async () => {
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        coach_id: 'coach-1',
        feedback_type: 'peer_observation',
        team_id: null,
        token: 'fake-token-uuid',
      }),
    )
  })

  it('rejects a player_voice request with no team selected', async () => {
    await expect(createFeedbackRequest(formData({ feedbackType: 'player_voice' }))).rejects.toThrow('Select a team')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects a player_voice request when the coach does not belong to the selected team', async () => {
    state.teamCreatedBy = null
    state.teamInviteAccepted = false
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('not a member of that team')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a player_voice request when the coach created the team', async () => {
    state.teamCreatedBy = 'coach-1'
    state.consentRow = { id: 'consent-1' }
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback')
    expect(insertMock).toHaveBeenCalled()
  })

  it('redirects to a consent-required state when no guardian consent is on file', async () => {
    state.teamInviteAccepted = true
    state.consentRow = null
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback/new?error=consent-required')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('creates a player_voice request when the coach belongs to the team and consent is on file', async () => {
    state.teamInviteAccepted = true
    state.consentRow = { id: 'consent-1' }
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedback_type: 'player_voice', team_id: 'team-1' }),
    )
  })

  it('enforces the minimum response threshold floor of 3, ignoring a lower requested value', async () => {
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'peer_observation', minimumResponseThreshold: '1' })),
    ).rejects.toThrow('REDIRECT:')
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ minimum_response_threshold: 3 }))
  })

  it('defaults the expiry to 14 days out when not specified', async () => {
    const before = Date.now()
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:')
    const call = insertMock.mock.calls[0][0] as { expires_at: string }
    const expiresAt = new Date(call.expires_at).getTime()
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
    expect(expiresAt).toBeGreaterThanOrEqual(before + fourteenDaysMs - 5000)
    expect(expiresAt).toBeLessThanOrEqual(before + fourteenDaysMs + 5000)
  })

  it('throws when the insert fails', async () => {
    state.insertError = { message: 'db down' }
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('db down')
  })
})

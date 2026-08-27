// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email: string } | null
  session: { access_token: string } | null
  canCreateDrillResult: { allowed: boolean; count: number; tier: string }
  hasClubAccessResult: boolean
  insertError: { message: string } | null
  updateError: { message: string } | null
} = {
  user: { id: 'coach-1', email: 'coach@example.com' },
  session: { access_token: 'token' },
  canCreateDrillResult: { allowed: true, count: 1, tier: 'free' },
  hasClubAccessResult: false,
  insertError: null,
  updateError: null,
}

const insertMock = vi.fn(async (payload: unknown) => ({ data: { id: 'drill-1' }, error: state.insertError }))
const updateEqMock = vi.fn(async (payload: unknown) => ({ error: state.updateError }))

vi.mock('next/server', () => ({
  after: (_cb: () => unknown) => {},
}))
vi.mock('next/cache', () => ({
  revalidateTag: () => {},
}))
vi.mock('@/lib/subscription', () => ({
  canCreateDrill: async () => state.canCreateDrillResult,
  activateTrial: async () => false,
  FREE_DRILL_LIMIT: 20,
  hasClubAccess: () => state.hasClubAccessResult,
  getEffectiveTier: async () => 'free',
}))
vi.mock('@/lib/email', () => ({
  sendTrialStartEmail: async () => {},
  sendDrillLimitEmail: async () => {},
}))
vi.mock('./youtube-actions', () => ({
  generateDrillGuideFromYoutube: async () => ({ success: false }),
}))
vi.mock('@/lib/youtube', () => ({
  extractYouTubeId: () => null,
  youtubeThumbnail: () => null,
  fetchChannelInfo: async () => null,
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({}) }) }) }),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      getSession: async () => ({ data: { session: state.session } }),
    },
    from: (table: string) => {
      if (table === 'drills') {
        return {
          insert: (payload: unknown) => ({
            select: () => ({ single: async () => insertMock(payload) }),
          }),
          update: (payload: unknown) => ({
            eq: () => ({
              eq: async () => {
                await updateEqMock(payload)
                return { error: state.updateError }
              },
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { display_name: 'Coach' } }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }),
}))

import { saveDrillDesign, updateDrillDesign } from './designer-actions'

function baseInput(overrides: Partial<Parameters<typeof saveDrillDesign>[0]> = {}) {
  return {
    title: 'Test Drill',
    description: null,
    categoryId: null,
    difficulty: null,
    ageGroup: null,
    playerCount: null,
    canvasJson: { background: 'full' as const, elements: [] },
    previewDataUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    facebookUrl: null,
    visibility: 'club' as const,
    clubId: 'club-1',
    ...overrides,
  }
}

describe('saveDrillDesign — club visibility authorization', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.insertError = null
    insertMock.mockClear()
  })

  it('rejects a club-visibility drill when the caller has no active club subscription', async () => {
    state.hasClubAccessResult = false
    const result = await saveDrillDesign(baseInput({ visibility: 'club' }))
    expect(result.error).toMatch(/upgrade/i)
    expect(result.error).toMatch(/club subscription/i)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a club-visibility drill when the caller has an active club subscription', async () => {
    state.hasClubAccessResult = true
    const result = await saveDrillDesign(baseInput({ visibility: 'club' }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
  })

  it('does not run the club-access check for public or private visibility', async () => {
    state.hasClubAccessResult = false
    const result = await saveDrillDesign(baseInput({ visibility: 'public', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: null, is_public: true }))
  })
})

describe('updateDrillDesign — club visibility authorization', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.updateError = null
    updateEqMock.mockClear()
  })

  function updateInput(overrides: Partial<Parameters<typeof updateDrillDesign>[0]> = {}) {
    return {
      ...baseInput(),
      drillId: 'drill-1',
      existingPreviewUrl: null,
      existingCanvasPreviewUrl: null,
      existingYoutubeUrl: null,
      existingTiktokUrl: null,
      existingFacebookUrl: null,
      existingClubId: null,
      ...overrides,
    }
  }

  it('rejects switching a drill to club visibility without an active club subscription', async () => {
    state.hasClubAccessResult = false
    const result = await updateDrillDesign(updateInput({ visibility: 'club' }))
    expect(result.error).toMatch(/upgrade/i)
    expect(updateEqMock).not.toHaveBeenCalled()
  })

  it('allows switching a drill to club visibility with an active club subscription', async () => {
    state.hasClubAccessResult = true
    const result = await updateDrillDesign(updateInput({ visibility: 'club' }))
    expect(result.error).toBeUndefined()
    expect(updateEqMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
  })

  it('does not run the club-access check when updating to public or private visibility', async () => {
    state.hasClubAccessResult = false
    const result = await updateDrillDesign(updateInput({ visibility: 'public', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(updateEqMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: null, is_public: true }))
  })
})

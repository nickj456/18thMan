// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email: string } | null
  session: { access_token: string } | null
  canCreateDrillResult: { allowed: boolean; count: number; tier: string }
  activateTrialResult: boolean
  hasClubAccessResult: boolean
  effectiveTierResult: string
  insertError: { message: string } | null
  updateError: { message: string } | null
} = {
  user: { id: 'coach-1', email: 'coach@example.com' },
  session: { access_token: 'token' },
  canCreateDrillResult: { allowed: true, count: 1, tier: 'free' },
  activateTrialResult: false,
  hasClubAccessResult: false,
  effectiveTierResult: 'free',
  insertError: null,
  updateError: null,
}

const insertMock = vi.fn(async (payload: unknown) => ({ data: { id: 'drill-1' }, error: state.insertError }))
const updateEqMock = vi.fn(async (payload: unknown) => ({ error: state.updateError }))
// A real vi.fn (not a plain arrow that ignores its argument) so tests can
// assert exactly which tier value reached the authorization check -- this
// is what catches a bug where the wrong tier variable gets reused.
const hasClubAccessMock = vi.fn((_tier: string) => state.hasClubAccessResult)
const activateTrialMock = vi.fn(async () => state.activateTrialResult)

vi.mock('next/server', () => ({
  after: (_cb: () => unknown) => {},
}))
vi.mock('next/cache', () => ({
  revalidateTag: () => {},
}))
vi.mock('@/lib/subscription', () => ({
  canCreateDrill: async () => state.canCreateDrillResult,
  activateTrial: () => activateTrialMock(),
  hasClubAccess: (tier: string) => hasClubAccessMock(tier),
  getEffectiveTier: async () => state.effectiveTierResult,
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
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'free' }
    state.activateTrialResult = false
    state.insertError = null
    insertMock.mockClear()
    hasClubAccessMock.mockClear()
    activateTrialMock.mockClear()
  })

  it('rejects a club-visibility drill when the caller has no active club subscription', async () => {
    state.hasClubAccessResult = false
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'free' }
    const result = await saveDrillDesign(baseInput({ visibility: 'club' }))
    expect(result.error).toMatch(/upgrade/i)
    expect(result.error).toMatch(/club subscription/i)
    expect(insertMock).not.toHaveBeenCalled()
    // Must be checked against the tier canCreateDrill actually resolved --
    // not a stale or hardcoded value.
    expect(hasClubAccessMock).toHaveBeenCalledWith('free')
  })

  it('allows a club-visibility drill when the caller has an active club subscription', async () => {
    state.hasClubAccessResult = true
    // Internally consistent with hasClubAccessResult=true -- a 'free' tier
    // would never actually have club access in production.
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'club' }
    const result = await saveDrillDesign(baseInput({ visibility: 'club' }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
    expect(hasClubAccessMock).toHaveBeenCalledWith('club')
  })

  it('does not run the club-access check for public or private visibility', async () => {
    state.hasClubAccessResult = false
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'free' }
    const result = await saveDrillDesign(baseInput({ visibility: 'public', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: null, is_public: true }))
    expect(hasClubAccessMock).not.toHaveBeenCalled()
  })
})

describe('saveDrillDesign — free-tier save gate', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'free' }
    state.activateTrialResult = false
    state.insertError = null
    insertMock.mockClear()
    hasClubAccessMock.mockClear()
    activateTrialMock.mockClear()
  })

  it('activates a one-time trial and lets the save through on a free-tier coach\'s first save attempt', async () => {
    state.canCreateDrillResult = { allowed: false, count: 0, tier: 'free' }
    state.activateTrialResult = true
    const result = await saveDrillDesign(baseInput({ visibility: 'private', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(result.drillId).toBe('drill-1')
    expect(activateTrialMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalled()
  })

  it('rejects the save when the free-tier coach has already used their one-time trial', async () => {
    state.canCreateDrillResult = { allowed: false, count: 0, tier: 'free' }
    state.activateTrialResult = false
    const result = await saveDrillDesign(baseInput({ visibility: 'private', clubId: null }))
    expect(result.error).toMatch(/upgrade/i)
    expect(result.error).toMatch(/subscription/i)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('does not attempt to activate a trial when canCreateDrill already allows the save', async () => {
    state.canCreateDrillResult = { allowed: true, count: 5, tier: 'club' }
    const result = await saveDrillDesign(baseInput({ visibility: 'private', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(activateTrialMock).not.toHaveBeenCalled()
  })

  it('uses the freshly-activated trial tier, not the stale free tier, for the same save\'s club-visibility check', async () => {
    state.canCreateDrillResult = { allowed: false, count: 0, tier: 'free' }
    state.activateTrialResult = true
    state.hasClubAccessResult = true
    const result = await saveDrillDesign(baseInput({ visibility: 'club', clubId: 'club-1' }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
    // The critical assertion: hasClubAccess must be called with 'trial'
    // (the tier this save just activated), never the original 'free'.
    expect(hasClubAccessMock).toHaveBeenCalledWith('trial')
  })
})

describe('updateDrillDesign — club visibility authorization', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.effectiveTierResult = 'free'
    state.updateError = null
    updateEqMock.mockClear()
    hasClubAccessMock.mockClear()
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
    state.effectiveTierResult = 'free'
    const result = await updateDrillDesign(updateInput({ visibility: 'club' }))
    expect(result.error).toMatch(/upgrade/i)
    expect(updateEqMock).not.toHaveBeenCalled()
    expect(hasClubAccessMock).toHaveBeenCalledWith('free')
  })

  it('allows switching a drill to club visibility with an active club subscription', async () => {
    state.hasClubAccessResult = true
    // Internally consistent with hasClubAccessResult=true.
    state.effectiveTierResult = 'club'
    const result = await updateDrillDesign(updateInput({ visibility: 'club' }))
    expect(result.error).toBeUndefined()
    expect(updateEqMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
    expect(hasClubAccessMock).toHaveBeenCalledWith('club')
  })

  it('does not run the club-access check when updating to public or private visibility', async () => {
    state.hasClubAccessResult = false
    state.effectiveTierResult = 'free'
    const result = await updateDrillDesign(updateInput({ visibility: 'public', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(updateEqMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: null, is_public: true }))
    expect(hasClubAccessMock).not.toHaveBeenCalled()
  })
})

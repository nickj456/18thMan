// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { getEffectiveTier } from './subscription'

const state: {
  profile: { role: string; club_id: string | null; trial_ends_at: string | null; subscription_tier: string | null } | null
  userOverride: { enabled: boolean; expires_at: string | null } | null
  clubOverride: { enabled: boolean; expires_at: string | null } | null
  club: { subscription_tier: string } | null
} = {
  profile: null,
  userOverride: null,
  clubOverride: null,
  club: null,
}

function overrideChain(targetType: string) {
  return {
    eq: () => ({
      eq: () => ({
        single: async () => ({ data: targetType === 'user' ? state.userOverride : state.clubOverride }),
      }),
    }),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = {
  from: (table: string) => {
    if (table === 'profiles') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: state.profile }) }) }) }
    }
    if (table === 'feature_overrides') {
      return { select: () => ({ eq: (_col: string, targetType: string) => overrideChain(targetType) }) }
    }
    if (table === 'clubs') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: state.club }) }) }) }
    }
    throw new Error(`unexpected table: ${table}`)
  },
}

describe('getEffectiveTier', () => {
  beforeEach(() => {
    state.profile = { role: 'coach', club_id: null, trial_ends_at: null, subscription_tier: null }
    state.userOverride = null
    state.clubOverride = null
    state.club = null
  })

  it('returns free when the profile does not exist', async () => {
    state.profile = null
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('free')
  })

  it('always returns club for admins, regardless of payment', async () => {
    state.profile = { role: 'admin', club_id: null, trial_ends_at: null, subscription_tier: null }
    expect(await getEffectiveTier(supabase, 'admin-1')).toBe('club')
  })

  it('returns club when a club_id is set and that club has an active club subscription', async () => {
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: null, subscription_tier: null }
    state.club = { subscription_tier: 'club' }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('club')
  })

  it('does NOT return club when club_id is set but the club has never completed payment (checkout abandoned)', async () => {
    // Regression test: /api/stripe/club-checkout sets profiles.club_id at
    // checkout-session-creation time, before Stripe confirms any payment.
    // clubs.subscription_tier defaults to 'free' and is only flipped to
    // 'club' by the webhook once a real subscription goes active -- a
    // user who backs out of the Stripe payment page must not get free
    // Club access just because club_id got set.
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: null, subscription_tier: null }
    state.club = { subscription_tier: 'free' }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('free')
  })

  it('falls through to trial when the unpaid club check fails but a trial is active', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: future, subscription_tier: null }
    state.club = { subscription_tier: 'free' }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('trial')
  })

  it('returns trial when trial_ends_at is in the future and there is no club', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    state.profile = { role: 'coach', club_id: null, trial_ends_at: future, subscription_tier: null }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('trial')
  })

  it('ignores an expired trial', async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    state.profile = { role: 'coach', club_id: null, trial_ends_at: past, subscription_tier: null }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('free')
  })

  it('returns coach when subscribed individually, with no club and no trial', async () => {
    state.profile = { role: 'coach', club_id: null, trial_ends_at: null, subscription_tier: 'coach' }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('coach')
  })

  it('returns free when none of the above apply', async () => {
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('free')
  })

  it('respects a true user-level feature override even with an unpaid club', async () => {
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: null, subscription_tier: null }
    state.club = { subscription_tier: 'free' }
    state.userOverride = { enabled: true, expires_at: null }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('club')
  })

  it('respects a false user-level feature override even on a paid club', async () => {
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: null, subscription_tier: null }
    state.club = { subscription_tier: 'club' }
    state.userOverride = { enabled: false, expires_at: null }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('free')
  })

  it('respects a true club-level feature override even when the club has not paid', async () => {
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: null, subscription_tier: null }
    state.club = { subscription_tier: 'free' }
    state.clubOverride = { enabled: true, expires_at: null }
    expect(await getEffectiveTier(supabase, 'user-1')).toBe('club')
  })
})

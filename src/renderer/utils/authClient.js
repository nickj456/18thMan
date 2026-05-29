import { createClient } from '@supabase/supabase-js'

// 18thMan.app Supabase project — hardcoded, anon key is public by design
const SUPABASE_URL  = 'https://khslkwspsqyopicxufun.supabase.co'
const SUPABASE_ANON = 'sb_publishable_V_VJv0i2ugp4wIMIy2WlPQ_SYrX0tM9'

export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { storageKey: '18thman-platform' },
})

// Tiers that have access to Match Analyst
const ALLOWED_TIERS = ['coach', 'club']

export async function checkAuth() {
  try {
    const { data: { session } } = await authClient.auth.getSession()
    if (!session?.user) return { state: 'logged-out', user: null, profile: null }

    const { data: profile } = await authClient
      .from('profiles')
      .select('subscription_tier, trial_ends_at, display_name, avatar_url, club')
      .eq('id', session.user.id)
      .single()

    const hasPaidTier  = ALLOWED_TIERS.includes(profile?.subscription_tier)
    const hasActiveTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()

    if (hasPaidTier || hasActiveTrial) {
      return { state: 'authenticated', user: session.user, profile, trial: !hasPaidTier && hasActiveTrial }
    }
    return { state: 'no-subscription', user: session.user, profile }
  } catch (err) {
    return { state: 'logged-out', user: null, profile: null }
  }
}

export async function signIn(email, password) {
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const { data: profile } = await authClient
    .from('profiles')
    .select('subscription_tier, trial_ends_at, display_name, avatar_url, club')
    .eq('id', data.user.id)
    .single()

  const hasPaidTier    = ALLOWED_TIERS.includes(profile?.subscription_tier)
  const hasActiveTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()

  if (hasPaidTier || hasActiveTrial) {
    return { user: data.user, profile, trial: !hasPaidTier && hasActiveTrial }
  }
  await authClient.auth.signOut()
  return {
    error: 'no-subscription',
    profile,
  }
}

export async function signOut() {
  await authClient.auth.signOut()
}

export function trialDaysLeft(profile) {
  if (!profile?.trial_ends_at) return 0
  const ms = new Date(profile.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

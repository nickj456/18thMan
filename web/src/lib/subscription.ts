import type { SupabaseClient } from '@supabase/supabase-js'
import type { EffectiveTier } from '@/lib/supabase/types'
export type { EffectiveTier }

export const FREE_DRILL_LIMIT = 20
export const FREE_AI_CHAT_DAILY_LIMIT = 20

/**
 * Returns the effective subscription tier for a user.
 * Resolution order:
 *   1. Admin feature override (per user, then per club)
 *   2. Club subscription tier
 *   3. Active trial
 *   4. Free
 */
export async function getEffectiveTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<EffectiveTier> {
  const { data } = await supabase
    .from('profiles')
    .select('role, club_id, trial_ends_at, subscription_tier')
    .eq('id', userId)
    .single()

  if (!data) return 'free'

  // 0. Admins always get full access — no paywall
  if (data.role === 'admin') return 'club'

  // 1. Check admin override for this user (all-features override)
  const userOverride = await getActiveOverride(supabase, 'user', userId, 'all')
  if (userOverride !== null) return userOverride ? 'club' : 'free'

  // 2. Check admin override for this user's club
  if (data.club_id) {
    const clubOverride = await getActiveOverride(supabase, 'club', data.club_id, 'all')
    if (clubOverride !== null) return clubOverride ? 'club' : 'free'
  }

  // 3. Club subscription
  if (data.club_id) {
    const { data: club } = await supabase
      .from('clubs')
      .select('subscription_tier')
      .eq('id', data.club_id)
      .single()
    if (club?.subscription_tier === 'club') return 'club'
  }

  // 4. Active trial
  if (data.trial_ends_at && new Date(data.trial_ends_at) > new Date()) return 'trial'

  // 5. Individual coach subscription
  if (data.subscription_tier === 'coach') return 'coach'

  return 'free'
}

/**
 * True if the tier includes club-only features:
 * private drills, coaching groups, collaborative sessions, GameSense.
 */
export function hasClubAccess(tier: EffectiveTier): boolean {
  return tier === 'club' || tier === 'trial'
}

/**
 * True if the tier includes individual premium features:
 * unlimited drills, PDF export, unlimited AI chat.
 * Coach Pro and Club both qualify.
 */
export function hasPremiumAccess(tier: EffectiveTier): boolean {
  return tier !== 'free'
}

/**
 * Check if a specific feature is overridden for a user or club.
 * Returns true (enabled), false (disabled), or null (no override).
 */
async function getActiveOverride(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  targetType: 'user' | 'club',
  targetId: string,
  feature: string
): Promise<boolean | null> {
  const { data } = await supabase
    .from('feature_overrides')
    .select('enabled, expires_at')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('feature', feature)
    .single()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return data.enabled
}

/** True if the user can create another drill (free tier: max 20) */
export async function canCreateDrill(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<{ allowed: boolean; tier: EffectiveTier; count: number }> {
  const [tier, countResult] = await Promise.all([
    getEffectiveTier(supabase, userId),
    supabase
      .from('drills')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId),
  ])

  const count = countResult.count ?? 0

  if (tier !== 'free') return { allowed: true, tier, count }
  return { allowed: count < FREE_DRILL_LIMIT, tier, count }
}

/** True if the user can send another AI chat message today (free tier: max 20/day) */
export async function canSendAiMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<{ allowed: boolean; tier: EffectiveTier; count: number }> {
  const tier = await getEffectiveTier(supabase, userId)
  if (tier !== 'free') return { allowed: true, tier, count: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', userId)
    .gte('created_at', today.toISOString())

  const msgCount = count ?? 0
  return { allowed: msgCount < FREE_AI_CHAT_DAILY_LIMIT, tier, count: msgCount }
}

/**
 * Activate a 48-hour trial for a user if they haven't had one before.
 * Returns true if trial was activated, false if already used or already active.
 */
export async function activateTrial(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('trial_used, trial_ends_at')
    .eq('id', userId)
    .single()

  if (!data || data.trial_used) return false
  if (data.trial_ends_at && new Date(data.trial_ends_at) > new Date()) return false

  const trialEnd = new Date()
  trialEnd.setHours(trialEnd.getHours() + 48)

  await supabase
    .from('profiles')
    .update({ trial_ends_at: trialEnd.toISOString(), trial_used: true })
    .eq('id', userId)

  return true
}

import 'server-only'
import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/supabase/pagination'
import type { SignupRow } from '@/lib/metrics/growth'
import type { TimestampedRow } from '@/lib/metrics/activity'
import type { PurchaseRow, ProductRow, ClubRow, ProfileSubscriptionRow } from '@/lib/metrics/revenue'
import type { PageViewRow } from '@/lib/metrics/pageviews'

// Every fetcher is wrapped in React `cache()` so that the several independent
// sections of /admin/performance that need the same table share one query per
// request. Error isolation is preserved: a cached rejected promise re-throws
// into each consumer's own try/catch, exactly as an un-cached one would.

/** ISO timestamp `sinceDays` days before now — used to bound large tables. */
function isoDaysAgo(sinceDays: number): string {
  return new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
}

export const getSignups = cache(async (): Promise<SignupRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<SignupRow>((from, to) =>
    supabase.from('profiles').select('created_at, role').order('id', { ascending: true }).range(from, to)
  )
})

export const getDrillsCreated = cache(async (): Promise<TimestampedRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('drills').select('created_at').order('id', { ascending: true }).range(from, to)
  )
})

export const getSessionPlansCreated = cache(async (): Promise<TimestampedRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('session_plans').select('created_at').order('id', { ascending: true }).range(from, to)
  )
})

/**
 * `messages` is the largest table in the app (AI chat + DMs + community
 * threads), so this is bounded to a trailing window rather than pulling the
 * full history into memory on every page load.
 */
export const getMessagesSent = cache(async (sinceDays: number = 90): Promise<TimestampedRow[]> => {
  const supabase = createServiceClient()
  const since = isoDaysAgo(sinceDays)
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', since)
      .order('id', { ascending: true })
      .range(from, to)
  )
})

export const getPodcastPlayTotal = cache(async (): Promise<number> => {
  const supabase = createServiceClient()
  const rows = await fetchAllRows<{ play_count: number }>((from, to) =>
    supabase.from('podcasts').select('play_count').order('id', { ascending: true }).range(from, to)
  )
  return rows.reduce((sum, row) => sum + row.play_count, 0)
})

export const getPurchases = cache(async (): Promise<PurchaseRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<PurchaseRow>((from, to) =>
    supabase
      .from('purchases')
      .select('created_at, amount_paid_cents, status, product_id')
      .order('id', { ascending: true })
      .range(from, to)
  )
})

export const getProducts = cache(async (): Promise<ProductRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<ProductRow>((from, to) =>
    supabase.from('products').select('id, title').order('id', { ascending: true }).range(from, to)
  )
})

export const getClubs = cache(async (): Promise<ClubRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<ClubRow>((from, to) =>
    supabase.from('clubs').select('subscription_tier').order('id', { ascending: true }).range(from, to)
  )
})

export const getProfileSubscriptions = cache(async (): Promise<ProfileSubscriptionRow[]> => {
  const supabase = createServiceClient()
  return fetchAllRows<ProfileSubscriptionRow>((from, to) =>
    supabase.from('profiles').select('subscription_tier').order('id', { ascending: true }).range(from, to)
  )
})

/** Count-only — no need to pull every club row just to tally the paying ones. */
export const getActiveClubSubscriptionCount = cache(async (): Promise<number> => {
  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('clubs')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_tier', 'club')
  if (error) throw new Error(error.message)
  return count ?? 0
})

/** Count-only — see `getActiveClubSubscriptionCount`. */
export const getActiveCoachSubscriptionCount = cache(async (): Promise<number> => {
  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_tier', 'coach')
  if (error) throw new Error(error.message)
  return count ?? 0
})

export const getPageViews = cache(async (sinceDays: number = 30): Promise<PageViewRow[]> => {
  const supabase = createServiceClient()
  const since = isoDaysAgo(sinceDays)
  return fetchAllRows<PageViewRow>((from, to) =>
    supabase
      .from('page_views')
      .select('path, created_at')
      .gte('created_at', since)
      .order('id', { ascending: true })
      .range(from, to)
  )
})

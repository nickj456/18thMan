import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/supabase/pagination'
import type { SignupRow } from '@/lib/metrics/growth'
import type { TimestampedRow } from '@/lib/metrics/activity'
import type { PurchaseRow, ProductRow, ClubRow, ProfileSubscriptionRow } from '@/lib/metrics/revenue'
import type { PageViewRow } from '@/lib/metrics/pageviews'

export async function getSignups(): Promise<SignupRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<SignupRow>((from, to) =>
    supabase.from('profiles').select('created_at, role').order('id', { ascending: true }).range(from, to)
  )
}

export async function getDrillsCreated(): Promise<TimestampedRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('drills').select('created_at').order('id', { ascending: true }).range(from, to)
  )
}

export async function getSessionPlansCreated(): Promise<TimestampedRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('session_plans').select('created_at').order('id', { ascending: true }).range(from, to)
  )
}

export async function getMessagesSent(): Promise<TimestampedRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<TimestampedRow>((from, to) =>
    supabase.from('messages').select('created_at').order('id', { ascending: true }).range(from, to)
  )
}

export async function getPodcastPlayTotal(): Promise<number> {
  const supabase = createServiceClient()
  const rows = await fetchAllRows<{ play_count: number }>((from, to) =>
    supabase.from('podcasts').select('play_count').order('id', { ascending: true }).range(from, to)
  )
  return rows.reduce((sum, row) => sum + row.play_count, 0)
}

export async function getPurchases(): Promise<PurchaseRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<PurchaseRow>((from, to) =>
    supabase
      .from('purchases')
      .select('created_at, amount_paid_cents, status, product_id')
      .order('id', { ascending: true })
      .range(from, to)
  )
}

export async function getProducts(): Promise<ProductRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<ProductRow>((from, to) =>
    supabase.from('products').select('id, title').order('id', { ascending: true }).range(from, to)
  )
}

export async function getClubs(): Promise<ClubRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<ClubRow>((from, to) =>
    supabase.from('clubs').select('subscription_tier').order('id', { ascending: true }).range(from, to)
  )
}

export async function getProfileSubscriptions(): Promise<ProfileSubscriptionRow[]> {
  const supabase = createServiceClient()
  return fetchAllRows<ProfileSubscriptionRow>((from, to) =>
    supabase.from('profiles').select('subscription_tier').order('id', { ascending: true }).range(from, to)
  )
}

export async function getPageViews(sinceDays: number = 30): Promise<PageViewRow[]> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
  return fetchAllRows<PageViewRow>((from, to) =>
    supabase
      .from('page_views')
      .select('path, created_at')
      .gte('created_at', since)
      .order('id', { ascending: true })
      .range(from, to)
  )
}

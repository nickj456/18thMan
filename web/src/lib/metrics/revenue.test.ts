import { describe, it, expect } from 'vitest'
import {
  aggregateRevenueByDay,
  aggregateRevenueByProduct,
  countActiveClubSubscriptions,
  countActiveCoachSubscriptions,
  type PurchaseRow,
  type ProductRow,
  type ClubRow,
  type ProfileSubscriptionRow,
} from './revenue'

const purchases: PurchaseRow[] = [
  { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p1' },
  { created_at: '2026-07-01T12:00:00Z', amount_paid_cents: 1000, status: 'completed', product_id: 'p2' },
  { created_at: '2026-07-02T10:00:00Z', amount_paid_cents: 700, status: 'refunded', product_id: 'p1' },
]

const products: ProductRow[] = [
  { id: 'p1', title: 'Attack Shape Pack' },
  { id: 'p2', title: 'Defensive Drills Bundle' },
]

describe('aggregateRevenueByDay', () => {
  it('sums completed purchases by day, excluding refunds', () => {
    expect(aggregateRevenueByDay(purchases)).toEqual([{ date: '2026-07-01', cents: 1500 }])
  })

  it('returns an empty array when there are no completed purchases', () => {
    const onlyRefunded: PurchaseRow[] = [
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'refunded', product_id: 'p1' },
    ]
    expect(aggregateRevenueByDay(onlyRefunded)).toEqual([])
  })

  it('returns an empty array for no rows at all', () => {
    expect(aggregateRevenueByDay([])).toEqual([])
  })

  // Fetchers order by `id` (a random uuid), so rows are not chronological.
  it('sums into date order even when purchases arrive shuffled', () => {
    const shuffled: PurchaseRow[] = [
      { created_at: '2026-07-03T10:00:00Z', amount_paid_cents: 200, status: 'completed', product_id: 'p1' },
      { created_at: '2026-07-01T12:00:00Z', amount_paid_cents: 1000, status: 'completed', product_id: 'p2' },
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p1' },
    ]
    expect(aggregateRevenueByDay(shuffled)).toEqual([
      { date: '2026-07-01', cents: 1500 },
      { date: '2026-07-03', cents: 200 },
    ])
  })
})

describe('aggregateRevenueByProduct', () => {
  it('sums completed purchase revenue per product title, sorted by revenue descending', () => {
    expect(aggregateRevenueByProduct(purchases, products)).toEqual([
      { productTitle: 'Defensive Drills Bundle', cents: 1000 },
      { productTitle: 'Attack Shape Pack', cents: 500 },
    ])
  })

  it('breaks ties alphabetically by product title', () => {
    const tied: PurchaseRow[] = [
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p2' },
      { created_at: '2026-07-01T11:00:00Z', amount_paid_cents: 500, status: 'completed', product_id: 'p1' },
    ]
    expect(aggregateRevenueByProduct(tied, products)).toEqual([
      { productTitle: 'Attack Shape Pack', cents: 500 },
      { productTitle: 'Defensive Drills Bundle', cents: 500 },
    ])
  })

  it('falls back to the product id when no matching product is found', () => {
    const orphaned: PurchaseRow[] = [
      { created_at: '2026-07-01T10:00:00Z', amount_paid_cents: 300, status: 'completed', product_id: 'missing' },
    ]
    expect(aggregateRevenueByProduct(orphaned, products)).toEqual([
      { productTitle: 'missing', cents: 300 },
    ])
  })
})

describe('countActiveClubSubscriptions', () => {
  it('counts clubs on the club tier', () => {
    const clubs: ClubRow[] = [
      { subscription_tier: 'club' },
      { subscription_tier: 'free' },
      { subscription_tier: 'club' },
    ]
    expect(countActiveClubSubscriptions(clubs)).toBe(2)
  })

  it('returns 0 for no clubs', () => {
    expect(countActiveClubSubscriptions([])).toBe(0)
  })
})

describe('countActiveCoachSubscriptions', () => {
  it('counts profiles on the coach tier', () => {
    const profiles: ProfileSubscriptionRow[] = [
      { subscription_tier: 'coach' },
      { subscription_tier: 'free' },
      { subscription_tier: 'club' },
      { subscription_tier: 'coach' },
    ]
    expect(countActiveCoachSubscriptions(profiles)).toBe(2)
  })

  it('returns 0 for no profiles', () => {
    expect(countActiveCoachSubscriptions([])).toBe(0)
  })
})

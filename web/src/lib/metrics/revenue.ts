export type SubscriptionTier = 'free' | 'club' | 'coach'

export type PurchaseRow = {
  created_at: string
  amount_paid_cents: number
  status: 'completed' | 'refunded'
  product_id: string
}

export type ProductRow = { id: string; title: string }
export type ClubRow = { subscription_tier: SubscriptionTier }
export type ProfileSubscriptionRow = { subscription_tier: SubscriptionTier }

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function aggregateRevenueByDay(purchases: PurchaseRow[]): { date: string; cents: number }[] {
  const totals = new Map<string, number>()
  for (const purchase of purchases) {
    if (purchase.status !== 'completed') continue
    const key = dayKey(purchase.created_at)
    totals.set(key, (totals.get(key) ?? 0) + purchase.amount_paid_cents)
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cents]) => ({ date, cents }))
}

export function aggregateRevenueByProduct(
  purchases: PurchaseRow[],
  products: ProductRow[]
): { productTitle: string; cents: number }[] {
  const titleById = new Map(products.map((p) => [p.id, p.title]))
  const totals = new Map<string, number>()
  for (const purchase of purchases) {
    if (purchase.status !== 'completed') continue
    const title = titleById.get(purchase.product_id) ?? purchase.product_id
    totals.set(title, (totals.get(title) ?? 0) + purchase.amount_paid_cents)
  }
  return [...totals.entries()]
    .sort(([aTitle, aCents], [bTitle, bCents]) => bCents - aCents || aTitle.localeCompare(bTitle))
    .map(([productTitle, cents]) => ({ productTitle, cents }))
}

export function countActiveClubSubscriptions(clubs: ClubRow[]): number {
  return clubs.filter((c) => c.subscription_tier === 'club').length
}

export function countActiveCoachSubscriptions(profiles: ProfileSubscriptionRow[]): number {
  return profiles.filter((p) => p.subscription_tier === 'coach').length
}

import { getPurchases, getProducts, getClubs, getProfileSubscriptions } from './data'
import {
  aggregateRevenueByDay,
  aggregateRevenueByProduct,
  countActiveClubSubscriptions,
  countActiveCoachSubscriptions,
} from '@/lib/metrics/revenue'
import { formatCents } from '@/lib/format'
import { StatTile, TimeSeriesChart, ErrorNote } from './components'

export async function TotalRevenueTile() {
  let total = 0
  let errorMessage: string | null = null

  try {
    const purchases = await getPurchases()
    total = purchases
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount_paid_cents, 0)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load purchases'
  }

  if (errorMessage) {
    return <ErrorNote label="Total revenue" message={errorMessage} />
  }

  return <StatTile label="Total revenue" value={formatCents(total)} />
}

export async function ActiveClubSubsTile() {
  let count = 0
  let errorMessage: string | null = null

  try {
    const clubs = await getClubs()
    count = countActiveClubSubscriptions(clubs)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load clubs'
  }

  if (errorMessage) {
    return <ErrorNote label="Active club subscriptions" message={errorMessage} />
  }

  return <StatTile label="Active club subscriptions" value={count} />
}

export async function ActiveCoachSubsTile() {
  let count = 0
  let errorMessage: string | null = null

  try {
    const profiles = await getProfileSubscriptions()
    count = countActiveCoachSubscriptions(profiles)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load coach subscriptions'
  }

  if (errorMessage) {
    return <ErrorNote label="Active Coach Pro subscriptions" message={errorMessage} />
  }

  return <StatTile label="Active Coach Pro subscriptions" value={count} />
}

export async function RevenueByDayChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const purchases = await getPurchases()
    data = aggregateRevenueByDay(purchases).map((d) => ({ date: d.date, value: d.cents / 100 }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load purchases'
  }

  if (errorMessage) {
    return <ErrorNote label="Revenue per day (£)" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Revenue per day (£)" />
}

export async function RevenueByProductList() {
  let breakdown: { productTitle: string; cents: number }[] = []
  let errorMessage: string | null = null

  try {
    const [purchases, products] = await Promise.all([getPurchases(), getProducts()])
    breakdown = aggregateRevenueByProduct(purchases, products)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load revenue by product'
  }

  if (errorMessage) {
    return <ErrorNote label="Revenue by product" message={errorMessage} />
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Revenue by product</p>
      {breakdown.length === 0 ? (
        <p className="text-sm text-zinc-600">No completed purchases yet.</p>
      ) : (
        <ul className="space-y-2">
          {breakdown.map((p) => (
            <li key={p.productTitle} className="flex justify-between text-sm text-zinc-300">
              <span>{p.productTitle}</span>
              <span className="font-semibold text-white">{formatCents(p.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

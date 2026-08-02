import { getPageViews } from './data'
import { aggregateCountByDay } from '@/lib/metrics/activity'
import { aggregateTopPages } from '@/lib/metrics/pageviews'
import { TimeSeriesChart, ErrorNote } from './components'

export async function PageViewsChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const views = await getPageViews()
    data = aggregateCountByDay(views).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load page views'
  }

  if (errorMessage) {
    return <ErrorNote label="Page views per day (last 30 days)" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Page views per day (last 30 days)" />
}

export async function TopPagesList() {
  let pages: { path: string; count: number }[] = []
  let errorMessage: string | null = null

  try {
    const views = await getPageViews()
    pages = aggregateTopPages(views, 10)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load page views'
  }

  if (errorMessage) {
    return <ErrorNote label="Top pages" message={errorMessage} />
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        Top pages (last 30 days)
      </p>
      {pages.length === 0 ? (
        <p className="text-sm text-zinc-600">No page views recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.path} className="flex justify-between text-sm text-zinc-300">
              <span className="font-mono">{p.path}</span>
              <span className="font-semibold text-white">{p.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

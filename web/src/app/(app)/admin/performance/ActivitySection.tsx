import { getDrillsCreated, getSessionPlansCreated, getMessagesSent, getPodcastPlayTotal } from './data'
import { aggregateCountByDay } from '@/lib/metrics/activity'
import { StatTile, TimeSeriesChart, ErrorNote } from './components'

export async function DrillsChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const rows = await getDrillsCreated()
    data = aggregateCountByDay(rows).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load drills'
  }

  if (errorMessage) {
    return <ErrorNote label="Drills created per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Drills created per day" />
}

export async function SessionPlansChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const rows = await getSessionPlansCreated()
    data = aggregateCountByDay(rows).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load session plans'
  }

  if (errorMessage) {
    return <ErrorNote label="Session plans created per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Session plans created per day" />
}

export async function MessagesChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const rows = await getMessagesSent()
    data = aggregateCountByDay(rows).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
  }

  if (errorMessage) {
    return <ErrorNote label="Messages (all types) per day — last 90 days" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Messages (all types) per day — last 90 days" />
}

export async function PodcastPlaysTile() {
  let total = 0
  let errorMessage: string | null = null

  try {
    total = await getPodcastPlayTotal()
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load podcast plays'
  }

  if (errorMessage) {
    return <ErrorNote label="Total podcast plays" message={errorMessage} />
  }

  return <StatTile label="Total podcast plays" value={total} />
}

import { getSignups } from './data'
import { aggregateSignupsByDay, aggregateCumulativeUsers, aggregateRoleBreakdown } from '@/lib/metrics/growth'
import { StatTile, TimeSeriesChart, ErrorNote } from './components'

export async function RoleTiles() {
  let breakdown: { role: string; count: number }[] = []
  let errorMessage: string | null = null

  try {
    const signups = await getSignups()
    breakdown = aggregateRoleBreakdown(signups)
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load sign-ups'
  }

  if (errorMessage) {
    return <ErrorNote label="Users by role" message={errorMessage} />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {breakdown.map((r) => (
        <StatTile key={r.role} label={`${r.role} accounts`} value={r.count} />
      ))}
    </div>
  )
}

export async function SignupsChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const signups = await getSignups()
    data = aggregateSignupsByDay(signups).map((d) => ({ date: d.date, value: d.count }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load sign-ups'
  }

  if (errorMessage) {
    return <ErrorNote label="Sign-ups per day" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Sign-ups per day" />
}

export async function CumulativeChart() {
  let data: { date: string; value: number }[] = []
  let errorMessage: string | null = null

  try {
    const signups = await getSignups()
    data = aggregateCumulativeUsers(signups).map((d) => ({ date: d.date, value: d.total }))
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load sign-ups'
  }

  if (errorMessage) {
    return <ErrorNote label="Cumulative users" message={errorMessage} />
  }

  return <TimeSeriesChart data={data} label="Cumulative users" />
}

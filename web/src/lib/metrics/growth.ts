export type SignupRow = {
  created_at: string
  role: 'admin' | 'coach' | 'viewer'
}

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function aggregateSignupsByDay(rows: SignupRow[]): { date: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = dayKey(row.created_at)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export function aggregateCumulativeUsers(rows: SignupRow[]): { date: string; total: number }[] {
  const byDay = aggregateSignupsByDay(rows)
  let running = 0
  return byDay.map(({ date, count }) => {
    running += count
    return { date, total: running }
  })
}

export function aggregateRoleBreakdown(rows: SignupRow[]): { role: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.role, (counts.get(row.role) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, count]) => ({ role, count }))
}

export type TimestampedRow = { created_at: string }

function dayKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function aggregateCountByDay(rows: TimestampedRow[]): { date: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = dayKey(row.created_at)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

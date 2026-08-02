export type PageViewRow = { path: string; created_at: string }

export function aggregateTopPages(
  rows: PageViewRow[],
  limit: number = 10
): { path: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.path, (counts.get(row.path) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }))
}

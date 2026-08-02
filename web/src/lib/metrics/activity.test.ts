import { describe, it, expect } from 'vitest'
import { aggregateCountByDay, type TimestampedRow } from './activity'

describe('aggregateCountByDay', () => {
  it('groups arbitrary timestamped rows by calendar day', () => {
    const rows: TimestampedRow[] = [
      { created_at: '2026-07-01T08:00:00Z' },
      { created_at: '2026-07-01T20:00:00Z' },
      { created_at: '2026-07-02T08:00:00Z' },
    ]
    expect(aggregateCountByDay(rows)).toEqual([
      { date: '2026-07-01', count: 2 },
      { date: '2026-07-02', count: 1 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateCountByDay([])).toEqual([])
  })

  // Fetchers order by `id` (a random uuid), so rows are not chronological.
  it('day-buckets and sorts correctly when rows arrive out of chronological order', () => {
    const shuffled: TimestampedRow[] = [
      { created_at: '2026-07-02T08:00:00Z' },
      { created_at: '2026-07-01T20:00:00Z' },
      { created_at: '2026-07-01T08:00:00Z' },
    ]
    expect(aggregateCountByDay(shuffled)).toEqual([
      { date: '2026-07-01', count: 2 },
      { date: '2026-07-02', count: 1 },
    ])
  })
})

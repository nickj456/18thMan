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
})

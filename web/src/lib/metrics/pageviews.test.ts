import { describe, it, expect } from 'vitest'
import { aggregateTopPages, type PageViewRow } from './pageviews'

const rows: PageViewRow[] = [
  { path: '/drills', created_at: '2026-07-01T10:00:00Z' },
  { path: '/drills', created_at: '2026-07-01T11:00:00Z' },
  { path: '/dashboard', created_at: '2026-07-01T12:00:00Z' },
  { path: '/drills', created_at: '2026-07-02T09:00:00Z' },
  { path: '/sessions', created_at: '2026-07-02T09:00:00Z' },
]

describe('aggregateTopPages', () => {
  it('ranks pages by view count, descending', () => {
    expect(aggregateTopPages(rows)).toEqual([
      { path: '/drills', count: 3 },
      { path: '/dashboard', count: 1 },
      { path: '/sessions', count: 1 },
    ])
  })

  it('respects the limit parameter', () => {
    expect(aggregateTopPages(rows, 1)).toEqual([{ path: '/drills', count: 3 }])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateTopPages([])).toEqual([])
  })
})

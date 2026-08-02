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

  it('breaks ties alphabetically by path', () => {
    // '/zebra' is seen first, but '/alpha' must still sort ahead of it on a tie.
    const tied: PageViewRow[] = [
      { path: '/zebra', created_at: '2026-07-01T10:00:00Z' },
      { path: '/alpha', created_at: '2026-07-01T11:00:00Z' },
    ]
    expect(aggregateTopPages(tied)).toEqual([
      { path: '/alpha', count: 1 },
      { path: '/zebra', count: 1 },
    ])
  })

  it('defaults to a limit of 10 when given more distinct paths', () => {
    const many: PageViewRow[] = Array.from({ length: 15 }, (_, i) => ({
      // Descending view counts: /p00 gets 15 views, /p14 gets 1.
      path: `/p${String(i).padStart(2, '0')}`,
      created_at: '2026-07-01T10:00:00Z',
    })).flatMap((row, i) =>
      Array.from({ length: 15 - i }, () => ({ ...row }))
    )
    const top = aggregateTopPages(many)
    expect(top).toHaveLength(10)
    expect(top[0]).toEqual({ path: '/p00', count: 15 })
    expect(top[9]).toEqual({ path: '/p09', count: 6 })
  })
})

import { describe, it, expect } from 'vitest'
import {
  aggregateSignupsByDay,
  aggregateCumulativeUsers,
  aggregateRoleBreakdown,
  type SignupRow,
} from './growth'

const rows: SignupRow[] = [
  { created_at: '2026-07-01T10:00:00Z', role: 'coach' },
  { created_at: '2026-07-01T14:00:00Z', role: 'viewer' },
  { created_at: '2026-07-02T09:00:00Z', role: 'coach' },
  { created_at: '2026-07-03T09:00:00Z', role: 'admin' },
]

describe('aggregateSignupsByDay', () => {
  it('groups sign-ups by calendar day, sorted ascending', () => {
    expect(aggregateSignupsByDay(rows)).toEqual([
      { date: '2026-07-01', count: 2 },
      { date: '2026-07-02', count: 1 },
      { date: '2026-07-03', count: 1 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateSignupsByDay([])).toEqual([])
  })

  // Production rows arrive ordered by `id` (a random uuid), never by
  // created_at — so the aggregation must not assume chronological input.
  it('day-buckets and sorts correctly when rows arrive out of chronological order', () => {
    const shuffled: SignupRow[] = [
      { created_at: '2026-07-03T09:00:00Z', role: 'admin' },
      { created_at: '2026-07-01T14:00:00Z', role: 'viewer' },
      { created_at: '2026-07-02T09:00:00Z', role: 'coach' },
      { created_at: '2026-07-01T10:00:00Z', role: 'coach' },
    ]
    expect(aggregateSignupsByDay(shuffled)).toEqual([
      { date: '2026-07-01', count: 2 },
      { date: '2026-07-02', count: 1 },
      { date: '2026-07-03', count: 1 },
    ])
  })
})

describe('aggregateCumulativeUsers', () => {
  it('produces a running total by day', () => {
    expect(aggregateCumulativeUsers(rows)).toEqual([
      { date: '2026-07-01', total: 2 },
      { date: '2026-07-02', total: 3 },
      { date: '2026-07-03', total: 4 },
    ])
  })

  it('accumulates in date order even when rows arrive shuffled', () => {
    const shuffled: SignupRow[] = [
      { created_at: '2026-07-03T09:00:00Z', role: 'admin' },
      { created_at: '2026-07-01T10:00:00Z', role: 'coach' },
      { created_at: '2026-07-02T09:00:00Z', role: 'coach' },
      { created_at: '2026-07-01T14:00:00Z', role: 'viewer' },
    ]
    expect(aggregateCumulativeUsers(shuffled)).toEqual([
      { date: '2026-07-01', total: 2 },
      { date: '2026-07-02', total: 3 },
      { date: '2026-07-03', total: 4 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateCumulativeUsers([])).toEqual([])
  })
})

describe('aggregateRoleBreakdown', () => {
  it('counts users per role', () => {
    expect(aggregateRoleBreakdown(rows)).toEqual([
      { role: 'admin', count: 1 },
      { role: 'coach', count: 2 },
      { role: 'viewer', count: 1 },
    ])
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateRoleBreakdown([])).toEqual([])
  })
})

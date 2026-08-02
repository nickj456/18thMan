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
})

describe('aggregateCumulativeUsers', () => {
  it('produces a running total by day', () => {
    expect(aggregateCumulativeUsers(rows)).toEqual([
      { date: '2026-07-01', total: 2 },
      { date: '2026-07-02', total: 3 },
      { date: '2026-07-03', total: 4 },
    ])
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

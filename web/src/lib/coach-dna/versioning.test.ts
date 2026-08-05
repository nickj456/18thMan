import { describe, it, expect } from 'vitest'
import { filterCurrentVersion, type VersionedResponse } from './versioning'

describe('filterCurrentVersion', () => {
  it('keeps only responses matching the current question version', () => {
    const rows: VersionedResponse[] = [
      { value: 80, submittedAt: '2026-01-01T00:00:00Z', questionVersion: 1 },
      { value: 60, submittedAt: '2026-06-01T00:00:00Z', questionVersion: 2 },
      { value: 90, submittedAt: '2026-07-01T00:00:00Z', questionVersion: 2 },
    ]
    expect(filterCurrentVersion(rows, 2)).toEqual([
      { value: 60, submittedAt: '2026-06-01T00:00:00Z', questionVersion: 2 },
      { value: 90, submittedAt: '2026-07-01T00:00:00Z', questionVersion: 2 },
    ])
  })

  it('excludes responses tied to a retired question version even if it was the most recent version at submission time', () => {
    const rows: VersionedResponse[] = [
      { value: 100, submittedAt: '2026-07-01T00:00:00Z', questionVersion: 1 },
    ]
    expect(filterCurrentVersion(rows, 2)).toEqual([])
  })

  it('returns an empty array for no rows', () => {
    expect(filterCurrentVersion([], 1)).toEqual([])
  })
})

// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { fetchAllRows } from './pagination'

describe('fetchAllRows', () => {
  it('returns all rows from a single short page', async () => {
    const query = vi.fn(async (from: number) => {
      if (from > 0) return { data: [], error: null }
      return { data: [{ id: 1 }, { id: 2 }], error: null }
    })
    const rows = await fetchAllRows(query)
    expect(rows).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('pages through multiple full pages until a short page ends the loop', async () => {
    const page0 = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: 1000 + i }))
    const page2 = [{ id: 2000 }]
    const query = vi.fn(async (from: number) => {
      if (from === 0) return { data: page0, error: null }
      if (from === 1000) return { data: page1, error: null }
      if (from === 2000) return { data: page2, error: null }
      return { data: [], error: null }
    })
    const rows = await fetchAllRows(query)
    expect(rows).toHaveLength(2001)
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('terminates cleanly when total rows is an exact multiple of the page size', async () => {
    const page0 = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
    const query = vi.fn(async (from: number) => {
      if (from === 0) return { data: page0, error: null }
      return { data: [], error: null }
    })
    const rows = await fetchAllRows(query)
    expect(rows).toHaveLength(1000)
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('returns an empty array when there are no rows', async () => {
    const query = vi.fn(async () => ({ data: [], error: null }))
    const rows = await fetchAllRows(query)
    expect(rows).toEqual([])
  })

  it('treats a null data page as empty rather than throwing', async () => {
    const query = vi.fn(async () => ({ data: null, error: null }))
    const rows = await fetchAllRows(query)
    expect(rows).toEqual([])
  })

  it('throws with the underlying error message when a page errors', async () => {
    const query = vi.fn(async () => ({ data: null, error: { message: 'connection reset' } }))
    await expect(fetchAllRows(query)).rejects.toThrow('connection reset')
  })
})

// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

const rows: Record<string, unknown[]> = {
  drills: [{ id: 'd1', updated_at: '2026-10-01T00:00:00Z' }],
  profiles: [
    { username: 'alex', updated_at: null },
    { username: 'coach.smith', updated_at: null },
    { username: 'Coach ', updated_at: null },
    { username: 'Smith&co', updated_at: null },
    { username: 'coach@example.com', updated_at: null },
  ],
}

function query(table: string) {
  const q = {
    select: () => q,
    eq: () => q,
    not: () => q,
    order: () => q,
    limit: async () => ({ data: rows[table], error: null }),
  }
  return q
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: query }),
}))

import sitemap from './sitemap'

describe('sitemap', () => {
  it('lists profiles with URL-safe usernames and leaves out emails, spaces and ampersands', async () => {
    const urls = (await sitemap()).map(e => e.url)
    const profiles = urls.filter(u => u.includes('/profile/'))

    expect(profiles).toEqual([
      expect.stringMatching(/\/profile\/alex$/),
      expect.stringMatching(/\/profile\/coach\.smith$/),
    ])
    expect(urls.join('\n')).not.toContain('@')
  })

  it('still lists public drills', async () => {
    const urls = (await sitemap()).map(e => e.url)
    expect(urls).toContainEqual(expect.stringMatching(/\/drills\/d1$/))
  })
})

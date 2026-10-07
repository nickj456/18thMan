// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = { ownUsername: 'Smith&co' }

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@/components/profile/AvatarUpload', () => ({ AvatarUpload: () => null }))
vi.mock('@/components/profile/ProfileForm', () => ({ ProfileForm: () => null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: { id: 'u1', username: state.ownUsername } }),
      }
      return table === 'social_links'
        ? { select: () => ({ eq: async () => ({ data: [] }) }) }
        : q
    },
  }),
}))

import EditProfilePage from './page'

describe('EditProfilePage', () => {
  beforeEach(() => {
    state.ownUsername = 'Smith&co'
  })

  it('treats a percent-encoded username in the URL as the owner’s own profile', async () => {
    await expect(EditProfilePage({ params: Promise.resolve({ username: 'Smith%26co' }) })).resolves.toBeTruthy()
  })

  it('redirects a non-owner to the public profile with the username re-encoded', async () => {
    state.ownUsername = 'alex'
    await expect(EditProfilePage({ params: Promise.resolve({ username: 'Smith%26co' }) }))
      .rejects.toThrow('REDIRECT:/profile/Smith%26co')
  })
})

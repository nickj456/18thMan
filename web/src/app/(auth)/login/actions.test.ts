// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  signInError: { message: string } | null
  oauthError: { message: string } | null
  oauthUrl: string | null
} = { signInError: null, oauthError: null, oauthUrl: null }

const revalidatePathMock = vi.fn()
const signInWithPasswordMock = vi.fn(async () => ({ error: state.signInError }))
const signInWithOAuthMock = vi.fn(async () => ({ data: { url: state.oauthUrl }, error: state.oauthError }))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
    },
  }),
}))

import { login, loginWithOAuth } from './actions'

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('login', () => {
  beforeEach(() => {
    state.signInError = null
    revalidatePathMock.mockClear()
    signInWithPasswordMock.mockClear()
  })

  it('redirects to the safe next path on success', async () => {
    await expect(
      login(formData({ email: 'coach@example.com', password: 'secret123', next: '/admin/coach-dna' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna')
  })

  it('falls back to /dashboard when next is missing', async () => {
    await expect(
      login(formData({ email: 'coach@example.com', password: 'secret123' })),
    ).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('falls back to /dashboard when next is an unsafe absolute URL', async () => {
    await expect(
      login(formData({ email: 'coach@example.com', password: 'secret123', next: 'https://evil.com' })),
    ).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('preserves a safe next through the error-redirect path', async () => {
    state.signInError = { message: 'Invalid credentials' }
    await expect(
      login(formData({ email: 'coach@example.com', password: 'wrong', next: '/admin/coach-dna' })),
    ).rejects.toThrow(/next=%2Fadmin%2Fcoach-dna/)
  })

  it('does not add a next param to the error redirect when next is unsafe', async () => {
    state.signInError = { message: 'Invalid credentials' }
    await expect(
      login(formData({ email: 'coach@example.com', password: 'wrong', next: '//evil.com' })),
    ).rejects.not.toThrow(/next=/)
  })
})

describe('loginWithOAuth', () => {
  beforeEach(() => {
    state.oauthError = null
    state.oauthUrl = 'https://accounts.google.com/o/oauth2/auth?foo=bar'
    signInWithOAuthMock.mockClear()
  })

  it('includes a safe next param in the OAuth redirectTo URL', async () => {
    await expect(loginWithOAuth('google', formData({ next: '/admin/coach-dna' }))).rejects.toThrow(
      'REDIRECT:https://accounts.google.com/o/oauth2/auth?foo=bar',
    )
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('next=%2Fadmin%2Fcoach-dna'),
        }),
      }),
    )
  })

  it('omits the next param from redirectTo when next is unsafe', async () => {
    await expect(loginWithOAuth('google', formData({ next: '//evil.com' }))).rejects.toThrow()
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.not.stringContaining('next='),
        }),
      }),
    )
  })
})

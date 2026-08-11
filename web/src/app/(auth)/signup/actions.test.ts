// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: { signUpError: { code?: string; message: string } | null } = { signUpError: null }

const signUpMock = vi.fn(async () => ({ error: state.signUpError }))
const sendWelcomeEmailMock = vi.fn(async (..._args: unknown[]) => {})

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signUp: signUpMock },
  }),
}))
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: (...args: unknown[]) => sendWelcomeEmailMock(...args),
}))

import { signup } from './actions'

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('signup', () => {
  beforeEach(() => {
    state.signUpError = null
    signUpMock.mockClear()
    sendWelcomeEmailMock.mockClear()
  })

  it('includes a safe next param in emailRedirectTo', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '/admin/coach-dna' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fadmin%2Fcoach-dna'),
        }),
      }),
    )
  })

  it('omits the next param from emailRedirectTo when next is missing', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        }),
      }),
    )
  })

  it('omits the next param from emailRedirectTo when next is unsafe', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '//evil.com' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        }),
      }),
    )
  })
})

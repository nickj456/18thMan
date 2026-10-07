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
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '/coach-dna' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fcoach-dna'),
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

  it('carries a safe next param forward in the error redirect on validation failure', async () => {
    await expect(
      signup(formData({
        email: 'coach@example.com',
        password: 'secret123',
        username: 'a'.repeat(33),
        next: '/coach-dna',
      })),
    ).rejects.toThrow(/^REDIRECT:\/signup\?error=.*&next=%2Fcoach-dna$/)
  })

  it('carries a safe next param onto the check-email screen', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '/coach-dna' })),
    ).rejects.toThrow(/^REDIRECT:\/signup\?success=check-email&next=%2Fcoach-dna$/)
  })

  it('leaves the check-email redirect bare when next is unsafe', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: 'coachsmith', next: '//evil.com' })),
    ).rejects.toThrow(/^REDIRECT:\/signup\?success=check-email$/)
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

  it.each([
    ['an email address', 'coach@example.com'],
    ['an ampersand', 'Smith&co'],
    ['capitals', 'Coach'],
  ])('rejects a username containing %s without calling signUp', async (_label, username) => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username })),
    ).rejects.toThrow('REDIRECT:/signup?error=Username+can+only+use')
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('trims surrounding whitespace before saving the username', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: ' coachsmith ' })),
    ).rejects.toThrow('REDIRECT:/signup?success=check-email')

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ data: { username: 'coachsmith' } }) }),
    )
  })

  it('treats a whitespace-only username as missing', async () => {
    await expect(
      signup(formData({ email: 'coach@example.com', password: 'secret123', username: '   ' })),
    ).rejects.toThrow('REDIRECT:/signup?error=All+fields+are+required')
  })
})

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  exchangeError: { message: string } | null
  user: { id: string; email?: string; created_at: string } | null
} = { exchangeError: null, user: null }

const exchangeCodeForSessionMock = vi.fn(async () => ({ error: state.exchangeError }))
const afterMock = vi.fn((cb: () => unknown) => cb())

vi.mock('next/server', () => ({
  after: (cb: () => unknown) => afterMock(cb),
  NextResponse: {
    redirect: (url: string) => ({ status: 307, headers: { get: () => url }, __redirectUrl: url }),
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { display_name: 'Coach' } }) }) }),
    }),
  }),
}))
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(async () => {}),
}))

import { GET } from './route'

function request(url: string): Request {
  return new Request(url)
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    state.exchangeError = null
    state.user = null
    exchangeCodeForSessionMock.mockClear()
  })

  it('redirects to a safe next path on success', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc&next=%2Fadmin%2Fcoach-dna'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/admin/coach-dna')
  })

  it('falls back to /dashboard when next is missing', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/dashboard')
  })

  it('falls back to /dashboard when next is an unsafe absolute URL', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc&next=https%3A%2F%2Fevil.com'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/dashboard')
  })

  it('falls back to /dashboard when next is a protocol-relative URL', async () => {
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc&next=%2F%2Fevil.com'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/dashboard')
  })

  it('redirects to /login with an error when the code exchange fails', async () => {
    state.exchangeError = { message: 'bad code' }
    const res = (await GET(request('https://app.example.com/auth/callback?code=abc'))) as unknown as { __redirectUrl: string }
    expect(res.__redirectUrl).toBe('https://app.example.com/login?error=auth-callback-failed')
  })
})

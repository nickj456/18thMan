// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))

import { updateSession } from './middleware'

function req(path: string) {
  return new NextRequest(new URL(path, 'https://app.example.com'))
}

function signedOut() {
  mockGetUser.mockResolvedValue({ data: { user: null } })
}

function signedIn() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
}

describe('updateSession', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('signed-out redirects', () => {
    beforeEach(signedOut)

    it('sends Coach DNA visitors to signup, carrying next', async () => {
      const res = await updateSession(req('/coach-dna'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('https://app.example.com/signup?next=%2Fcoach-dna')
    })

    it('sends Coach DNA sub-routes to signup with the full path and query', async () => {
      const res = await updateSession(req('/coach-dna/assessment/a1?q=q2'))
      expect(res.headers.get('location')).toBe(
        `https://app.example.com/signup?next=${encodeURIComponent('/coach-dna/assessment/a1?q=q2')}`,
      )
    })

    it('still sends other protected routes to login', async () => {
      const res = await updateSession(req('/dashboard'))
      expect(res.headers.get('location')).toBe('https://app.example.com/login?next=%2Fdashboard')
    })

    it('does not treat a lookalike prefix as Coach DNA', async () => {
      const res = await updateSession(req('/coach-dnax'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('lets public routes through', async () => {
      const res = await updateSession(req('/drills'))
      expect(res.headers.get('location')).toBeNull()
    })
  })

  it('lets signed-in coaches into Coach DNA', async () => {
    signedIn()
    const res = await updateSession(req('/coach-dna'))
    expect(res.headers.get('location')).toBeNull()
  })

  describe('signed-in visits to /login', () => {
    it('skip the form and go to a safe next', async () => {
      signedIn()
      const res = await updateSession(req('/login?next=%2Fcoach-dna%2Ffeedback'))
      expect(res.headers.get('location')).toBe('https://app.example.com/coach-dna/feedback')
    })

    it('ignore an unsafe next', async () => {
      signedIn()
      const res = await updateSession(req('/login?next=%2F%2Fevil.com'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('show the form when there is no next', async () => {
      signedIn()
      const res = await updateSession(req('/login'))
      expect(res.headers.get('location')).toBeNull()
    })

    it('show the form to signed-out visitors even with a next', async () => {
      signedOut()
      const res = await updateSession(req('/login?next=%2Fcoach-dna'))
      expect(res.headers.get('location')).toBeNull()
    })
  })

  describe('legacy /admin/coach-dna links', () => {
    it('redirects the old root to /coach-dna without an auth lookup', async () => {
      const res = await updateSession(req('/admin/coach-dna'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('https://app.example.com/coach-dna')
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('keeps the sub-path and query', async () => {
      const res = await updateSession(req('/admin/coach-dna/feedback?tab=open'))
      expect(res.headers.get('location')).toBe('https://app.example.com/coach-dna/feedback?tab=open')
    })

    it('does not redirect a lookalike legacy prefix', async () => {
      signedIn()
      const res = await updateSession(req('/admin/coach-dnax'))
      expect(res.status).not.toBe(307)
      expect(res.headers.get('location')).toBeNull()
    })

    it('leaves other admin routes alone', async () => {
      signedIn()
      const res = await updateSession(req('/admin/users'))
      expect(res.headers.get('location')).toBeNull()
    })
  })
})

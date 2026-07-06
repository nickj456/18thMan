// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const state: {
  user: { id: string } | null
  isAdmin: boolean
  clubCustomer: string | null
  profileCustomer: string | null
} = { user: null, isAdmin: false, clubCustomer: null, profileCustomer: null }

const portalCreate = vi.fn(async () => ({ url: 'https://billing.stripe.com/session' }))
const serviceFrom = vi.fn((table: string) => ({
  select: () => ({
    eq: () => ({
      single: async () =>
        table === 'clubs' ? { data: { stripe_customer_id: state.clubCustomer } } : { data: null },
    }),
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { stripe_customer_id: state.profileCustomer } }),
        }),
      }),
    }),
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: serviceFrom }),
}))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ billingPortal: { sessions: { create: portalCreate } } }),
}))
vi.mock('@/lib/clubs', () => ({
  isClubAdmin: async () => state.isAdmin,
}))

import { POST } from './route'

function request(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    headers: new Headers({ origin: 'https://18thman.app' }),
  } as unknown as NextRequest
}

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    state.user = { id: 'user-1' }
    state.isAdmin = false
    state.clubCustomer = null
    state.profileCustomer = null
    portalCreate.mockClear()
    serviceFrom.mockClear()
  })

  it('returns 401 when unauthenticated', async () => {
    state.user = null
    const res = await POST(request({ clubId: 'club-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for a non-admin clubId and never reads club billing data (IDOR guard)', async () => {
    state.isAdmin = false
    const res = await POST(request({ clubId: 'club-1' }))
    expect(res.status).toBe(403)
    expect(serviceFrom).not.toHaveBeenCalled()
    expect(portalCreate).not.toHaveBeenCalled()
  })

  it('returns 404 for an admin whose club has no Stripe customer', async () => {
    state.isAdmin = true
    state.clubCustomer = null
    const res = await POST(request({ clubId: 'club-1' }))
    expect(res.status).toBe(404)
  })

  it('creates a portal session for a club admin', async () => {
    state.isAdmin = true
    state.clubCustomer = 'cus_club'
    const res = await POST(request({ clubId: 'club-1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.com/session' })
    expect(portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_club', return_url: 'https://18thman.app/settings' }),
    )
  })

  it('uses the personal profile customer when no clubId is supplied', async () => {
    state.profileCustomer = 'cus_personal'
    const res = await POST(request({}))
    expect(res.status).toBe(200)
    expect(portalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_personal' }))
  })

  it('returns 500 when Stripe throws', async () => {
    state.profileCustomer = 'cus_personal'
    portalCreate.mockRejectedValueOnce(new Error('stripe down'))
    const res = await POST(request({}))
    expect(res.status).toBe(500)
  })
})

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const state: {
  user: { id: string; email?: string } | null
  isAdmin: boolean
  club: { id: string; name: string; stripe_customer_id: string | null } | null
  profile: { display_name: string | null; stripe_customer_id: string | null } | null
} = { user: null, isAdmin: false, club: null, profile: null }

const isClubAdminMock = vi.fn(async () => state.isAdmin)
const checkoutCreate = vi.fn(async () => ({ url: 'https://checkout.stripe.com/session' }))
const customersCreate = vi.fn(async () => ({ id: 'cus_new' }))
const serviceUpdate = vi.fn(() => ({ eq: async () => ({}) }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: table === 'clubs' ? state.club : state.profile }),
        }),
      }),
      update: serviceUpdate,
    }),
  }),
}))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: checkoutCreate } },
    customers: { create: customersCreate },
  }),
  getPriceId: (plan: string) =>
    ['coach_monthly', 'coach_yearly', 'club_monthly', 'club_yearly'].includes(plan) ? `price_${plan}` : null,
}))
vi.mock('@/lib/clubs', () => ({
  isClubAdmin: (...args: unknown[]) => isClubAdminMock(...(args as [])),
}))

import { POST } from './route'

function request(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    headers: new Headers({ origin: 'https://18thman.app' }),
  } as unknown as NextRequest
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    state.user = { id: 'user-1', email: 'coach@club.com' }
    state.isAdmin = false
    state.club = null
    state.profile = null
    isClubAdminMock.mockClear()
    checkoutCreate.mockClear()
    customersCreate.mockClear()
  })

  it('returns 401 when unauthenticated', async () => {
    state.user = null
    const res = await POST(request({ plan: 'club_monthly', clubId: 'club-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unknown plan', async () => {
    const res = await POST(request({ plan: 'enterprise_lifetime' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a club plan without a clubId', async () => {
    const res = await POST(request({ plan: 'club_monthly' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 for a club plan when the user is not that club admin (IDOR guard)', async () => {
    state.isAdmin = false
    const res = await POST(request({ plan: 'club_monthly', clubId: 'club-1' }))
    expect(res.status).toBe(403)
    expect(checkoutCreate).not.toHaveBeenCalled()
  })

  it('creates a checkout session for a club admin, minting a customer if missing', async () => {
    state.isAdmin = true
    state.club = { id: 'club-1', name: 'Harlequins', stripe_customer_id: null }
    const res = await POST(request({ plan: 'club_monthly', clubId: 'club-1' }))
    expect(res.status).toBe(200)
    expect(customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { club_id: 'club-1' } }),
    )
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_new', mode: 'subscription' }),
    )
  })

  it('personal plans never consult isClubAdmin and use the profile customer', async () => {
    state.profile = { display_name: 'Nick', stripe_customer_id: 'cus_personal' }
    const res = await POST(request({ plan: 'coach_monthly' }))
    expect(res.status).toBe(200)
    expect(isClubAdminMock).not.toHaveBeenCalled()
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_personal' }),
    )
  })
})

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const state: {
  user: { id: string; email?: string } | null
  product: { id: string; slug: string; title: string; price_cents: number | null; stripe_price_id: string | null; is_published: boolean } | null
  profile: { display_name: string | null; stripe_customer_id: string | null } | null
} = { user: null, product: null, profile: null }

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
          single: async () => ({ data: table === 'products' ? state.product : state.profile }),
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
}))

import { POST } from './route'

function request(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    headers: new Headers({ origin: 'https://18thman.app' }),
  } as unknown as NextRequest
}

describe('POST /api/stripe/shop-checkout', () => {
  beforeEach(() => {
    state.user = { id: 'user-1', email: 'coach@club.com' }
    state.product = null
    state.profile = null
    checkoutCreate.mockClear()
    customersCreate.mockClear()
  })

  it('returns 400 when productId is missing', async () => {
    const res = await POST(request({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the product does not exist', async () => {
    state.product = null
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 404 when the product is unpublished', async () => {
    state.product = { id: 'prod-1', slug: 'drill-pack', title: 'Drill Pack', price_cents: 500, stripe_price_id: null, is_published: false }
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 when the product has no price (subscription-only)', async () => {
    state.product = { id: 'prod-1', slug: 'drill-pack', title: 'Drill Pack', price_cents: null, stripe_price_id: null, is_published: true }
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(400)
    expect(checkoutCreate).not.toHaveBeenCalled()
  })

  it('creates a one-time payment checkout session, minting a customer if missing', async () => {
    state.product = { id: 'prod-1', slug: 'drill-pack', title: 'Drill Pack', price_cents: 500, stripe_price_id: null, is_published: true }
    state.profile = { display_name: 'Nick', stripe_customer_id: null }
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(200)
    expect(customersCreate).toHaveBeenCalled()
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_new',
        mode: 'payment',
        metadata: { type: 'product', product_id: 'prod-1', user_id: 'user-1' },
        success_url: 'https://18thman.app/shop/drill-pack?purchased=1',
        cancel_url: 'https://18thman.app/shop/drill-pack',
      }),
    )
  })

  it('reuses an existing Stripe customer', async () => {
    state.product = { id: 'prod-1', slug: 'drill-pack', title: 'Drill Pack', price_cents: 500, stripe_price_id: null, is_published: true }
    state.profile = { display_name: 'Nick', stripe_customer_id: 'cus_existing' }
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(200)
    expect(customersCreate).not.toHaveBeenCalled()
    expect(checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_existing' }))
  })

  it('creates a guest checkout session with no customer, letting Stripe collect the email', async () => {
    state.user = null
    state.product = { id: 'prod-1', slug: 'drill-pack', title: 'Drill Pack', price_cents: 500, stripe_price_id: null, is_published: true }
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(200)
    expect(customersCreate).not.toHaveBeenCalled()
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer_creation: 'always',
        metadata: { type: 'product', product_id: 'prod-1', user_id: '' },
      }),
    )
    expect(checkoutCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ customer: expect.anything() }),
    )
  })

  it('returns 500 when Stripe throws', async () => {
    state.product = { id: 'prod-1', slug: 'drill-pack', title: 'Drill Pack', price_cents: 500, stripe_price_id: null, is_published: true }
    state.profile = { display_name: 'Nick', stripe_customer_id: 'cus_existing' }
    checkoutCreate.mockRejectedValueOnce(new Error('stripe down'))
    const res = await POST(request({ productId: 'prod-1' }))
    expect(res.status).toBe(500)
  })
})

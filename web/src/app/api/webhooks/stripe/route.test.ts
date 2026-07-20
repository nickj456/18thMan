// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const constructEvent = vi.fn()
const purchasesUpsert = vi.fn(() => ({ select: async () => ({ data: state.insertedRows, error: null }) }))
const purchasesUpdateEq = vi.fn(async () => ({ error: null }))
const purchasesUpdate = vi.fn(() => ({ eq: purchasesUpdateEq }))
const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: 'https://signed.example/file.pdf' }, error: null }))
const sendPurchaseConfirmationEmail = vi.fn()
const getUserById = vi.fn(async () => ({ data: { user: { email: 'member@example.com' } } }))

const state: {
  product: { title: string; storage_path: string } | null
  insertedRows: { id: string }[]
} = { product: { title: 'Drill Pack', storage_path: 'products/drill-pack.pdf' }, insertedRows: [{ id: 'purchase-1' }] }

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}))
vi.mock('@/lib/email', () => ({
  sendSubscriptionConfirmationEmail: vi.fn(),
  sendVideoAnalysisRequestEmail: vi.fn(),
  sendPurchaseConfirmationEmail: (...args: unknown[]) => sendPurchaseConfirmationEmail(...args),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'purchases') return { upsert: purchasesUpsert, update: purchasesUpdate }
      if (table === 'products') return { select: () => ({ eq: () => ({ single: async () => ({ data: state.product }) }) }) }
      return { update: () => ({ eq: async () => ({}) }) }
    },
    storage: { from: () => ({ createSignedUrl }) },
    auth: { admin: { getUserById } },
  }),
}))

import { POST } from './route'

function request(body: string): NextRequest {
  return {
    text: async () => body,
    headers: new Headers({ 'stripe-signature': 'sig_test' }),
  } as unknown as NextRequest
}

describe('POST /api/webhooks/stripe — product purchases', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://18thman.app'
    constructEvent.mockReset()
    purchasesUpsert.mockClear()
    createSignedUrl.mockClear()
    sendPurchaseConfirmationEmail.mockClear()
    getUserById.mockClear()
    purchasesUpdate.mockClear()
    purchasesUpdateEq.mockClear()
    state.product = { title: 'Drill Pack', storage_path: 'products/drill-pack.pdf' }
    state.insertedRows = [{ id: 'purchase-1' }]
  })

  it('inserts a purchase row (idempotently) and emails the member when a logged-in checkout completes', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_intent: 'pi_123',
          amount_total: 1500,
          metadata: { type: 'product', product_id: 'prod-1', user_id: 'user-1' },
        },
      },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        guest_email: null,
        product_id: 'prod-1',
        stripe_checkout_session_id: 'cs_test_1',
        stripe_payment_intent_id: 'pi_123',
        amount_paid_cents: 1500,
      }),
      { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true },
    )
    expect(sendPurchaseConfirmationEmail).toHaveBeenCalledWith(
      'member@example.com',
      expect.objectContaining({ productTitle: 'Drill Pack', downloadUrl: 'https://18thman.app/shop/library' }),
    )
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('inserts a guest purchase keyed by email and sends a signed download link', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_guest',
          payment_intent: 'pi_456',
          amount_total: 500,
          metadata: { type: 'product', product_id: 'prod-1', user_id: '' },
          customer_details: { email: 'guest@example.com' },
        },
      },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        guest_email: 'guest@example.com',
        product_id: 'prod-1',
      }),
      { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true },
    )
    expect(createSignedUrl).toHaveBeenCalledWith('products/drill-pack.pdf', 60 * 60 * 24 * 7)
    expect(sendPurchaseConfirmationEmail).toHaveBeenCalledWith(
      'guest@example.com',
      expect.objectContaining({ productTitle: 'Drill Pack', downloadUrl: 'https://signed.example/file.pdf' }),
    )
    expect(getUserById).not.toHaveBeenCalled()
  })

  it('does not re-send the confirmation email when Stripe redelivers an already-processed event', async () => {
    state.insertedRows = [] // ignoreDuplicates: true -> conflicting upsert returns no rows
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_intent: 'pi_123',
          amount_total: 1500,
          metadata: { type: 'product', product_id: 'prod-1', user_id: 'user-1' },
        },
      },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpsert).toHaveBeenCalled()
    expect(sendPurchaseConfirmationEmail).not.toHaveBeenCalled()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('ignores product checkouts missing both user_id and a guest email rather than crashing', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_2', metadata: { type: 'product', product_id: 'prod-1', user_id: '' } } },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpsert).not.toHaveBeenCalled()
  })

  it('does not touch purchases for non-product checkout sessions', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_3', metadata: {} } },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpsert).not.toHaveBeenCalled()
  })

  it('marks a purchase refunded by payment_intent on charge.refunded', async () => {
    constructEvent.mockReturnValue({
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_123' } },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpdate).toHaveBeenCalledWith({ status: 'refunded' })
    expect(purchasesUpdateEq).toHaveBeenCalledWith('stripe_payment_intent_id', 'pi_123')
  })

  it('ignores charge.refunded with no payment_intent rather than crashing', async () => {
    constructEvent.mockReturnValue({
      type: 'charge.refunded',
      data: { object: {} },
    })

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect(purchasesUpdateEq).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid signature', async () => {
    constructEvent.mockImplementation(() => { throw new Error('bad sig') })
    const res = await POST(request('{}'))
    expect(res.status).toBe(400)
  })
})

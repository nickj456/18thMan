// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  product: { id: string; storage_path: string; min_subscription_tier: string | null; is_published: boolean } | null
  tier: string
  purchased: boolean
  signedUrlError: { message: string } | null
} = { user: null, product: null, tier: 'free', purchased: false, signedUrlError: null }

const createSignedUrlMock = vi.fn(async () =>
  state.signedUrlError
    ? { data: null, error: state.signedUrlError }
    : { data: { signedUrl: 'https://signed.example/file.pdf' }, error: null },
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: state.product }),
        }),
      }),
    }),
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    storage: { from: () => ({ createSignedUrl: createSignedUrlMock }) },
  }),
}))
vi.mock('@/lib/subscription', () => ({
  getEffectiveTier: async () => state.tier,
}))
vi.mock('@/lib/shop', () => ({
  canAccessProduct: async () => state.purchased || state.tier === 'club',
}))

import { getProductDownloadUrl } from './shop-actions'

describe('getProductDownloadUrl', () => {
  beforeEach(() => {
    state.user = { id: 'user-1' }
    state.product = { id: 'prod-1', storage_path: 'products/file.pdf', min_subscription_tier: null, is_published: true }
    state.tier = 'free'
    state.purchased = false
    state.signedUrlError = null
    createSignedUrlMock.mockClear()
  })

  it('rejects unauthenticated callers', async () => {
    state.user = null
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ error: 'Not authenticated' })
    expect(createSignedUrlMock).not.toHaveBeenCalled()
  })

  it('rejects when the product does not exist', async () => {
    state.product = null
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ error: 'Product not found' })
  })

  it('rejects when the product is unpublished', async () => {
    state.product = { ...state.product!, is_published: false }
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ error: 'Product not found' })
  })

  it('rejects when the user is not entitled (no purchase, no tier)', async () => {
    state.purchased = false
    state.tier = 'free'
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ error: 'You do not have access to this content' })
    expect(createSignedUrlMock).not.toHaveBeenCalled()
  })

  it('mints a signed URL for a user who purchased the product', async () => {
    state.purchased = true
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ url: 'https://signed.example/file.pdf' })
    expect(createSignedUrlMock).toHaveBeenCalledWith('products/file.pdf', 3600)
  })

  it('mints a signed URL for a user entitled via subscription tier', async () => {
    state.tier = 'club'
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ url: 'https://signed.example/file.pdf' })
  })

  it('surfaces an error when signing the URL fails', async () => {
    state.purchased = true
    state.signedUrlError = { message: 'storage error' }
    const result = await getProductDownloadUrl('prod-1')
    expect(result).toEqual({ error: 'Could not generate download link' })
  })
})

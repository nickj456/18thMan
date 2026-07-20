import { describe, it, expect, vi } from 'vitest'
import { tierMeetsRequirement, canAccessProduct, getPurchasedProductIds } from './shop'

describe('tierMeetsRequirement', () => {
  it('returns false when the product has no tier requirement', () => {
    expect(tierMeetsRequirement('club', null)).toBe(false)
  })

  it('returns true when the tier meets the requirement', () => {
    expect(tierMeetsRequirement('club', 'coach')).toBe(true)
    expect(tierMeetsRequirement('coach', 'coach')).toBe(true)
  })

  it('returns false when the tier is below the requirement', () => {
    expect(tierMeetsRequirement('free', 'coach')).toBe(false)
  })

  it('treats an active trial as club-level access', () => {
    expect(tierMeetsRequirement('trial', 'club')).toBe(true)
  })
})

describe('canAccessProduct', () => {
  const product = { id: 'prod-1', min_subscription_tier: 'coach' as const }

  function mockSupabase(purchaseFound: boolean) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: purchaseFound ? { id: 'purchase-1' } : null }),
                }),
              }),
            }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  it('grants access when the tier meets the requirement, without checking purchases', async () => {
    const supabase = mockSupabase(false)
    const fromSpy = vi.spyOn(supabase, 'from')
    const result = await canAccessProduct(supabase, 'user-1', product, 'club')
    expect(result).toBe(true)
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('grants access when the user purchased the product', async () => {
    const supabase = mockSupabase(true)
    const result = await canAccessProduct(supabase, 'user-1', product, 'free')
    expect(result).toBe(true)
  })

  it('denies access when the tier is insufficient and no purchase exists', async () => {
    const supabase = mockSupabase(false)
    const result = await canAccessProduct(supabase, 'user-1', product, 'free')
    expect(result).toBe(false)
  })
})

describe('getPurchasedProductIds', () => {
  it('returns a set of purchased product ids for the user', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: [{ product_id: 'prod-1' }, { product_id: 'prod-2' }] }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const result = await getPurchasedProductIds(supabase, 'user-1')
    expect(result).toEqual(new Set(['prod-1', 'prod-2']))
  })

  it('returns an empty set when the user has no purchases', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: null }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    const result = await getPurchasedProductIds(supabase, 'user-1')
    expect(result).toEqual(new Set())
  })
})

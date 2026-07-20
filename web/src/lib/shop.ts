import type { SupabaseClient } from '@supabase/supabase-js'
import type { EffectiveTier, Product } from '@/lib/supabase/types'

const TIER_RANK: Record<EffectiveTier, number> = { free: 0, trial: 2, coach: 1, club: 2 }

/** True if an effective tier meets a product's minimum required tier. */
export function tierMeetsRequirement(
  effectiveTier: EffectiveTier,
  minTier: Product['min_subscription_tier']
): boolean {
  if (!minTier) return false
  return TIER_RANK[effectiveTier] >= TIER_RANK[minTier]
}

/**
 * Whether a user is entitled to a product's content — either they bought it,
 * or their subscription tier unlocks it.
 */
export async function canAccessProduct(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  product: Pick<Product, 'id' | 'min_subscription_tier'>,
  effectiveTier: EffectiveTier
): Promise<boolean> {
  if (tierMeetsRequirement(effectiveTier, product.min_subscription_tier)) return true

  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', product.id)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle()

  return !!data
}

/**
 * Batch-fetches the set of product IDs a user has purchased. Use this on
 * listing pages (catalog, library) instead of calling canAccessProduct per
 * product, which would issue one purchases query per card.
 */
export async function getPurchasedProductIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('purchases')
    .select('product_id')
    .eq('user_id', userId)
    .eq('status', 'completed')

  return new Set((data ?? []).map((row: { product_id: string }) => row.product_id))
}

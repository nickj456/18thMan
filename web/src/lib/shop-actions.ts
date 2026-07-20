'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getEffectiveTier } from '@/lib/subscription'
import { canAccessProduct } from '@/lib/shop'

// shop-assets is a private bucket with no per-user storage RLS policy —
// entitlement (purchase or subscription tier) is checked here, then the
// signed URL is minted with the service client. See migration 077.
export async function getProductDownloadUrl(productId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: product } = await supabase
    .from('products')
    .select('id, storage_path, min_subscription_tier, is_published')
    .eq('id', productId)
    .single()

  if (!product || !product.is_published) return { error: 'Product not found' }

  const tier = await getEffectiveTier(supabase, user.id)
  const entitled = await canAccessProduct(supabase, user.id, product, tier)
  if (!entitled) return { error: 'You do not have access to this content' }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.storage
    .from('shop-assets')
    .createSignedUrl(product.storage_path, 3600)

  if (error || !data) return { error: 'Could not generate download link' }
  return { url: data.signedUrl }
}

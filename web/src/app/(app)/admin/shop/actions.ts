'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/slug'
import type { ProductContentType, SubscriptionTier } from '@/lib/supabase/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, error: 'Not authenticated' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase: null, user: null, error: 'Not authorised' as const }
  return { supabase, user, error: null }
}

/** Generates a slug from the title, disambiguating against existing rows with a numeric suffix. */
async function uniqueProductSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
): Promise<string> {
  const base = slugify(title)
  let candidate = base
  let suffix = 2
  while (true) {
    const { data } = await supabase.from('products').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export async function createProduct(input: {
  title: string
  description: string
  contentType: ProductContentType
  priceCents: number | null
  minSubscriptionTier: SubscriptionTier | null
  storagePath: string
  previewImageUrl: string | null
}) {
  const { supabase, user, error } = await requireAdmin()
  if (error || !supabase || !user) return { error }

  if (!input.title.trim()) return { error: 'Title is required' }
  if (!input.storagePath.trim()) return { error: 'A content file must be uploaded' }
  if (input.priceCents === null && input.minSubscriptionTier === null) {
    return { error: 'Set a price, a required subscription tier, or both' }
  }

  const slug = await uniqueProductSlug(supabase, input.title.trim())

  const { error: dbError } = await supabase.from('products').insert({
    title: input.title.trim(),
    slug,
    description: input.description.trim() || null,
    content_type: input.contentType,
    price_cents: input.priceCents,
    min_subscription_tier: input.minSubscriptionTier,
    storage_path: input.storagePath,
    preview_image_url: input.previewImageUrl?.trim() || null,
    is_published: false,
    created_by: user.id,
  })

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/shop')
  return { success: true }
}

export async function updateProduct(productId: string, input: {
  title: string
  description: string
  contentType: ProductContentType
  priceCents: number | null
  minSubscriptionTier: SubscriptionTier | null
  storagePath: string
  previewImageUrl: string | null
}) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  if (!input.title.trim()) return { error: 'Title is required' }
  if (!input.storagePath.trim()) return { error: 'A content file must be uploaded' }
  if (input.priceCents === null && input.minSubscriptionTier === null) {
    return { error: 'Set a price, a required subscription tier, or both' }
  }

  const { data: updated, error: dbError } = await supabase
    .from('products')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      content_type: input.contentType,
      price_cents: input.priceCents,
      min_subscription_tier: input.minSubscriptionTier,
      storage_path: input.storagePath,
      preview_image_url: input.previewImageUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select('slug')
    .single()

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/shop')
  if (updated?.slug) revalidatePath(`/shop/${updated.slug}`)
  revalidatePath('/shop')
  return { success: true }
}

export async function togglePublish(productId: string, isPublished: boolean) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  const { error: dbError } = await supabase
    .from('products')
    .update({ is_published: isPublished })
    .eq('id', productId)

  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/shop')
  revalidatePath('/shop')
  return { success: true }
}

export async function deleteProduct(productId: string) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  const { error: dbError } = await supabase.from('products').delete().eq('id', productId)
  if (dbError) return { error: dbError.message }
  revalidatePath('/admin/shop')
  revalidatePath('/shop')
  return { success: true }
}

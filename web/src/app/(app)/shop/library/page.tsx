import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Video, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier } from '@/lib/subscription'
import { tierMeetsRequirement } from '@/lib/shop'
import type { Product } from '@/lib/supabase/types'

export const metadata = { title: 'My Shop Library — 18th Man' }

const CONTENT_ICON = { pdf: FileText, video: Video, bundle: Package } as const

export default async function ShopLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const productColumns = 'id, slug, title, description, content_type, price_cents, min_subscription_tier, preview_image_url, is_published, created_at'

  const [{ data: purchases }, { data: published }, tier] = await Promise.all([
    supabase
      .from('purchases')
      .select(`product_id, products(${productColumns})`)
      .eq('user_id', user.id)
      .eq('status', 'completed'),
    supabase.from('products').select(productColumns).eq('is_published', true),
    getEffectiveTier(supabase, user.id),
  ])

  const purchasedProducts = (purchases ?? [])
    .map(row => row.products as unknown as Product | null)
    .filter((p): p is Product => !!p)

  const tierProducts = ((published ?? []) as Product[]).filter(
    p => tierMeetsRequirement(tier, p.min_subscription_tier),
  )

  const seen = new Set<string>()
  const items = [...purchasedProducts, ...tierProducts].filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-heading text-2xl">My Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} item{items.length !== 1 ? 's' : ''} you own or have access to
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="font-medium">Your library is empty</p>
          <p className="text-sm text-muted-foreground mt-1">
            Browse the <Link href="/shop" className="text-indigo-400 hover:underline">shop</Link> to find coaching resources
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(product => {
            const Icon = CONTENT_ICON[product.content_type]
            return (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors flex items-start gap-3"
              >
                <Icon size={20} className="text-zinc-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h2 className="font-semibold leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {product.title}
                  </h2>
                  {product.description && (
                    <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{product.description}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

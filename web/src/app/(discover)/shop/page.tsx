import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier } from '@/lib/subscription'
import { tierMeetsRequirement } from '@/lib/shop'
import { Badge } from '@/components/ui/badge'
import { FileText, Video, Package } from 'lucide-react'
import type { EffectiveTier, Product } from '@/lib/supabase/types'

export const metadata = { title: 'Shop — 18th Man' }

const CONTENT_ICON = { pdf: FileText, video: Video, bundle: Package } as const

function formatPrice(cents: number | null) {
  if (cents === null) return null
  return `£${(cents / 100).toFixed(2)}`
}

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: products }, tier] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    user ? getEffectiveTier(supabase, user.id) : Promise.resolve<EffectiveTier>('free'),
  ])

  const items = (products ?? []) as Product[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-heading text-2xl">Shop</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Official coaching PDFs, videos, and plans from 18th Man
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🛒</div>
          <p className="font-medium">Nothing in the shop yet</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for new resources</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(product => {
            const Icon = CONTENT_ICON[product.content_type]
            const includedInTier = user && tierMeetsRequirement(tier, product.min_subscription_tier)
            const price = formatPrice(product.price_cents)

            return (
              <Link
                key={product.id}
                href={`/shop/${product.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <div className="aspect-video bg-zinc-800 relative">
                  {product.preview_image_url ? (
                    <Image src={product.preview_image_url} alt={product.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <Icon size={32} />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h2 className="font-semibold leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {product.title}
                  </h2>
                  {product.description && (
                    <p className="text-sm text-zinc-500 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {includedInTier && (
                      <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">
                        Included in your plan
                      </Badge>
                    )}
                    {price && (
                      <span className="text-sm font-semibold text-zinc-300">{price}</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

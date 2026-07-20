import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier } from '@/lib/subscription'
import { tierMeetsRequirement, getPurchasedProductIds } from '@/lib/shop'
import { BuyButton } from '@/components/shop/BuyButton'
import { DownloadButton } from '@/components/shop/DownloadButton'
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

  const [{ data: products }, tier, purchasedIds] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, description, content_type, price_cents, min_subscription_tier, preview_image_url, is_published, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    user ? getEffectiveTier(supabase, user.id) : Promise.resolve<EffectiveTier>('free'),
    user ? getPurchasedProductIds(supabase, user.id) : Promise.resolve(new Set<string>()),
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
          {items.map((product, index) => {
            const Icon = CONTENT_ICON[product.content_type]
            const includedInTier = !!user && tierMeetsRequirement(tier, product.min_subscription_tier)
            const entitled = includedInTier || purchasedIds.has(product.id)
            const price = formatPrice(product.price_cents)

            return (
              // Not a single Link wrapping the whole card: the footer holds a real
              // <button> (Buy/Download), and nesting interactive elements inside an
              // <a> is invalid HTML (see DrillCard.tsx / ISSUE-002 for the same bug).
              <div
                key={product.id}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors flex flex-col"
              >
                <Link href={`/shop/${product.id}`} className="block">
                  <div className="aspect-video bg-zinc-800 relative">
                    {product.preview_image_url ? (
                      <Image
                        src={product.preview_image_url}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        priority={index === 0}
                        className="object-cover"
                      />
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

                <div className="px-4 pb-4 mt-auto">
                  {entitled ? (
                    <DownloadButton
                      productId={product.id}
                      label={product.content_type === 'video' ? 'Watch now' : 'Download'}
                    />
                  ) : price ? (
                    <BuyButton productId={product.id} priceLabel={price} />
                  ) : user ? (
                    <Link href="/settings" className="text-xs text-indigo-400 hover:underline">
                      Upgrade to unlock
                    </Link>
                  ) : (
                    <Link href="/signup" className="text-xs text-indigo-400 hover:underline">
                      Sign up to unlock
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

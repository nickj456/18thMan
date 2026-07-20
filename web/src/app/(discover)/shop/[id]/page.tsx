import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, FileText, Video, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier } from '@/lib/subscription'
import { canAccessProduct, tierMeetsRequirement } from '@/lib/shop'
import { BuyButton } from '@/components/shop/BuyButton'
import { DownloadButton } from '@/components/shop/DownloadButton'
import type { Product } from '@/lib/supabase/types'

const CONTENT_ICON = { pdf: FileText, video: Video, bundle: Package } as const
const CONTENT_LABEL = { pdf: 'PDF download', video: 'Video', bundle: 'Bundle' } as const

function formatPrice(cents: number | null) {
  if (cents === null) return null
  return `£${(cents / 100).toFixed(2)}`
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ purchased?: string }>
}) {
  const { id } = await params
  const { purchased } = await searchParams
  const justPurchased = purchased === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) notFound()
  const p = product as Product

  const tier = user ? await getEffectiveTier(supabase, user.id) : null
  const entitled = user && tier ? await canAccessProduct(supabase, user.id, p, tier) : false
  const includedInTier = tier ? tierMeetsRequirement(tier, p.min_subscription_tier) : false
  const Icon = CONTENT_ICON[p.content_type]
  const price = formatPrice(p.price_cents)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/shop" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft size={14} />
        Back to shop
      </Link>

      {justPurchased && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3 items-start">
          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-emerald-300">Thanks for your purchase!</p>
            <p className="text-xs text-zinc-400">
              {entitled
                ? user
                  ? "It's ready below — you can also find it any time in your library."
                  : "We've emailed your download link to the address you used at checkout."
                : "Payment received — we're finalising your order. This usually takes a few seconds; refresh if it's not ready yet."}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="aspect-video bg-zinc-800 relative">
          {p.preview_image_url ? (
            <Image
              src={p.preview_image_url}
              alt={p.title}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              priority
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <Icon size={48} />
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
              <Icon size={12} />
              {CONTENT_LABEL[p.content_type]}
            </p>
            <h1 className="app-heading text-2xl mt-1">{p.title}</h1>
          </div>

          {p.description && <p className="text-sm text-zinc-400 leading-relaxed">{p.description}</p>}

          <div className="pt-2 max-w-xs space-y-1.5">
            {entitled ? (
              <DownloadButton
                productId={p.id}
                label={p.content_type === 'video' ? 'Watch now' : 'Download'}
              />
            ) : includedInTier ? (
              <p className="text-sm text-emerald-400">Included in your subscription — refresh to unlock.</p>
            ) : price && justPurchased ? (
              <p className="text-sm text-zinc-500">Waiting for payment confirmation…</p>
            ) : price ? (
              <>
                <BuyButton productId={p.id} priceLabel={price} />
                <p className="text-xs text-zinc-600 text-center">
                  {user
                    ? "You'll be able to download it instantly from your library."
                    : "We'll email you a download link once payment goes through."}
                </p>
              </>
            ) : user ? (
              <p className="text-sm text-zinc-500">
                This content is included with a subscription. Visit{' '}
                <Link href="/settings" className="text-indigo-400 hover:underline">Settings</Link> to upgrade.
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                This content is included with a subscription.{' '}
                <Link href="/signup" className="text-indigo-400 hover:underline">Sign up</Link> to unlock it.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

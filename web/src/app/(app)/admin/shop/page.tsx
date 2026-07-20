import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NewProductForm } from './NewProductForm'
import { togglePublish, deleteProduct } from './actions'
import type { Product } from '@/lib/supabase/types'

export const metadata = { title: 'Shop — Admin' }

function formatPrice(cents: number | null) {
  if (cents === null) return '—'
  return `£${(cents / 100).toFixed(2)}`
}

export default async function AdminShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  const items = (products ?? []) as Product[]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Shop</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage sellable coaching resources</p>
        </div>
      </div>

      <NewProductForm />

      <div className="space-y-3">
        <h2 className="app-heading text-lg">All products</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No products yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map(product => (
              <div key={product.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{product.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      product.is_published
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                    }`}>
                      {product.is_published ? 'published' : 'draft'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 capitalize">
                      {product.content_type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {formatPrice(product.price_cents)}
                    {product.min_subscription_tier && ` · included in ${product.min_subscription_tier}`}
                  </p>
                </div>
                <form action={async () => { 'use server'; await togglePublish(product.id, !product.is_published) }}>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-semibold hover:border-zinc-500 transition-colors"
                  >
                    {product.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </form>
                <form action={async () => { 'use server'; await deleteProduct(product.id) }}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

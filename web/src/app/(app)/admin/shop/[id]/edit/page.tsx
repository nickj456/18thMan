import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '../../ProductForm'
import type { Product } from '@/lib/supabase/types'

export const metadata = { title: 'Edit product — Admin' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single()
  if (!product) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/shop" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Edit product</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{(product as Product).title}</p>
        </div>
      </div>

      <ProductForm mode="edit" productId={id} initial={product as Product} />
    </div>
  )
}

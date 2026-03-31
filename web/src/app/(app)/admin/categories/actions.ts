'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, userId: user.id }
}

export async function createCategory(formData: FormData) {
  const { supabase, userId } = await requireAdmin()
  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('Name is required')

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // Get max sort_order
  const { data: existing } = await supabase.from('drill_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase.from('drill_categories').insert({
    name,
    slug,
    sort_order: nextOrder,
    created_by: userId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
}

export async function updateCategory(id: string, formData: FormData) {
  const { supabase } = await requireAdmin()
  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('Name is required')
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { error } = await supabase.from('drill_categories').update({ name, slug }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('drill_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
}

export async function reorderCategory(id: string, direction: 'up' | 'down') {
  const { supabase } = await requireAdmin()

  const { data: cats } = await supabase
    .from('drill_categories')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })

  if (!cats) return
  const idx = cats.findIndex(c => c.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= cats.length) return

  const a = cats[idx]
  const b = cats[swapIdx]

  await Promise.all([
    supabase.from('drill_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from('drill_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])

  revalidatePath('/admin/categories')
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WellbeingResourceType } from '@/lib/supabase/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, userId: user.id }
}

export async function createWellbeingResource(formData: FormData) {
  const { supabase, userId } = await requireAdmin()

  const type = formData.get('type') as WellbeingResourceType
  const title = (formData.get('title') as string)?.trim()
  const subtitle = (formData.get('subtitle') as string)?.trim() || null

  if (!type) throw new Error('Type is required')
  if (!title) throw new Error('Title is required')

  const { data: existing } = await supabase
    .from('wellbeing_resources')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase.from('wellbeing_resources').insert({
    type,
    title,
    subtitle,
    content: {},
    sort_order: nextOrder,
    created_by: userId,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
}

export async function deleteWellbeingResource(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('wellbeing_resources').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
}

export async function updateWellbeingSortOrder(id: string, direction: 'up' | 'down') {
  const { supabase } = await requireAdmin()

  const { data: resources } = await supabase
    .from('wellbeing_resources')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })

  if (!resources) return
  const idx = resources.findIndex(r => r.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= resources.length) return

  const a = resources[idx]
  const b = resources[swapIdx]

  await Promise.all([
    supabase.from('wellbeing_resources').update({ sort_order: b.sort_order }).eq('id', a.id),
    supabase.from('wellbeing_resources').update({ sort_order: a.sort_order }).eq('id', b.id),
  ])

  revalidatePath('/admin/wellbeing')
  revalidatePath('/wellbeing')
}

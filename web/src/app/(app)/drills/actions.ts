'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveDrill(drillId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('drill_saves').insert({ drill_id: drillId, user_id: user.id })
  revalidatePath(`/drills/${drillId}`)
}

export async function unsaveDrill(drillId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('drill_saves')
    .delete()
    .eq('drill_id', drillId)
    .eq('user_id', user.id)
  revalidatePath(`/drills/${drillId}`)
}

export async function submitRating(drillId: string, rating: number, comment: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') return

  await supabase.from('drill_ratings').upsert({
    drill_id: drillId,
    user_id: user.id,
    rating,
    comment: comment || null,
  }, { onConflict: 'drill_id,user_id' })

  revalidatePath(`/drills/${drillId}`)
}

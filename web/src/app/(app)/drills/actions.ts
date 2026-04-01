'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateDrillGuideFromYoutube } from './youtube-actions'

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

export async function regenerateDrillGuide(drillId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { success: false, error: 'Admin only' }

  const { data: drill } = await supabase
    .from('drills')
    .select('youtube_url')
    .eq('id', drillId)
    .single()

  if (!drill?.youtube_url) {
    return { success: false, error: 'No YouTube URL on this drill — add one before regenerating.' }
  }

  const result = await generateDrillGuideFromYoutube(drill.youtube_url)
  if (!result.success) return { success: false, error: result.error }

  await supabase
    .from('drills')
    .update({ ai_guide: result.guide })
    .eq('id', drillId)

  revalidatePath(`/drills/${drillId}`)
  return { success: true }
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

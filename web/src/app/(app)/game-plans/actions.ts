'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { GamePlanDetailLevel } from '@/lib/supabase/types'

async function getAuthenticatedAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { supabase, user, profile, error: 'Admin access required' }
  }

  return { supabase, user, profile, error: null }
}

export async function createGamePlan(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, error } = await getAuthenticatedAdmin()
  if (error || !user) return { error: error ?? 'Not authenticated' }

  const kickOffTime = (formData.get('kick_off_time') as string | null)?.trim() || null
  const detailLevel = ((formData.get('detail_level') as string | null)?.trim() || 'standard') as GamePlanDetailLevel

  const { data: game_plan, error: dbError } = await supabase
    .from('game_plans')
    .insert({
      opposition: formData.get('opposition') as string,
      pitch: formData.get('pitch') as string,
      kick_off_time: kickOffTime,
      home_logo_url: (formData.get('home_logo_url') as string | null) || null,
      away_logo_url: (formData.get('away_logo_url') as string | null) || null,
      defence: formData.get('defence') as string,
      attack: formData.get('attack') as string,
      structure: formData.get('structure') as string,
      aims: formData.get('aims') as string,
      backs: formData.get('backs') as string,
      forwards: formData.get('forwards') as string,
      half_backs: formData.get('half_backs') as string,
      detail_level: detailLevel,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans')
  redirect('/game-plans/' + game_plan.id)
}

export async function updateGamePlan(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, profile, error } = await getAuthenticatedAdmin()
  if (error || !user) return { error: error ?? 'Not authenticated' }

  // Verify the record exists and user owns it or is admin
  const { data: existing } = await supabase
    .from('game_plans')
    .select('id, created_by')
    .eq('id', id)
    .single()

  if (!existing) return { error: 'Game plan not found' }
  if (existing.created_by !== user.id && profile?.role !== 'admin') {
    return { error: 'Not authorised to update this game plan' }
  }

  const kickOffTime = (formData.get('kick_off_time') as string | null)?.trim() || null
  const detailLevel = ((formData.get('detail_level') as string | null)?.trim() || 'standard') as GamePlanDetailLevel

  const { error: dbError } = await supabase
    .from('game_plans')
    .update({
      opposition: formData.get('opposition') as string,
      pitch: formData.get('pitch') as string,
      kick_off_time: kickOffTime,
      home_logo_url: (formData.get('home_logo_url') as string | null) || null,
      away_logo_url: (formData.get('away_logo_url') as string | null) || null,
      defence: formData.get('defence') as string,
      attack: formData.get('attack') as string,
      structure: formData.get('structure') as string,
      aims: formData.get('aims') as string,
      backs: formData.get('backs') as string,
      forwards: formData.get('forwards') as string,
      half_backs: formData.get('half_backs') as string,
      detail_level: detailLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans/' + id)
  return {}
}

export async function generateGamePlan(id: string): Promise<{ error?: string }> {
  const { supabase, user, error } = await getAuthenticatedAdmin()
  if (error || !user) return { error: error ?? 'Not authenticated' }

  const { data: gamePlan } = await supabase
    .from('game_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!gamePlan) return { error: 'Game plan not found' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/game-plan/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({
        id: gamePlan.id,
        opposition: gamePlan.opposition,
        pitch: gamePlan.pitch,
        kick_off_time: gamePlan.kick_off_time,
        home_logo_url: gamePlan.home_logo_url,
        away_logo_url: gamePlan.away_logo_url,
        defence: gamePlan.defence,
        attack: gamePlan.attack,
        structure: gamePlan.structure,
        aims: gamePlan.aims,
        backs: gamePlan.backs,
        forwards: gamePlan.forwards,
        half_backs: gamePlan.half_backs,
        detail_level: gamePlan.detail_level,
      }),
    })
  } catch (fetchError) {
    return { error: fetchError instanceof Error ? fetchError.message : 'Failed to call generate API' }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText)
    return { error: body || 'Generation failed' }
  }

  const body = await response.json().catch(() => null)
  const aiPlan = body?.plan ?? body

  const { error: dbError } = await supabase
    .from('game_plans')
    .update({
      ai_plan: aiPlan,
      status: 'generated',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans/' + id)
  return {}
}

export async function deleteGamePlan(id: string): Promise<{ error?: string }> {
  const { supabase, error } = await getAuthenticatedAdmin()
  if (error) return { error }

  const { error: dbError } = await supabase
    .from('game_plans')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans')
  redirect('/game-plans')
}

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const side = formData.get('side') as string | null
  if (side !== 'home' && side !== 'away') return { error: 'Invalid side — must be "home" or "away"' }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()
    : file.type.split('/')[1] ?? 'png'

  const path = `${user.id}/${side}-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('game-plan-logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('game-plan-logos')
    .getPublicUrl(path)

  return { url: publicUrl }
}

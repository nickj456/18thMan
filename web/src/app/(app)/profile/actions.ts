'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'No file provided' }
  if (file.size > 2 * 1024 * 1024) return { error: 'File must be under 2MB' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // Add cache-bust so browsers pick up the new image immediately
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  return { success: true, avatarUrl }
}

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const display_name = (formData.get('display_name') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const club = (formData.get('club') as string)?.trim() || null
  const coaching_level = (formData.get('coaching_level') as string)?.trim() || null

  const { data: profile } = await supabase
    .from('profiles')
    .update({ display_name, bio, club, coaching_level })
    .eq('id', user.id)
    .select('username')
    .single()

  revalidatePath('/profile')
  revalidatePath(`/profile/${profile?.username}`)
  revalidatePath('/', 'layout')
}

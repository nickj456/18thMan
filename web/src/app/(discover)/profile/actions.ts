'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function followUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === targetUserId) return { error: 'Cannot follow yourself' }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId })

  if (error) return { error: error.message }

  // Notify the followed user
  const service = createServiceClient()
  const { data: follower } = await service
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  await service.from('notifications').insert({
    user_id: targetUserId,
    type: 'followed_you',
    actor_id: user.id,
    data: {
      follower_id: user.id,
      follower_display_name: follower?.display_name ?? follower?.username ?? 'A coach',
      follower_username: follower?.username ?? '',
    },
  })

  revalidatePath(`/profile/[username]`, 'page')
  return { success: true }
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath(`/profile/[username]`, 'page')
  return { success: true }
}

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

const SOCIAL_PLATFORMS = ['twitter', 'instagram', 'facebook', 'youtube', 'linkedin'] as const

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const display_name = (formData.get('display_name') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const club = (formData.get('club') as string)?.trim() || null
  const coaching_level = (formData.get('coaching_level') as string)?.trim() || null

  if (display_name && display_name.length > 100) return
  if (bio && bio.length > 500) return
  if (club && club.length > 100) return

  const { data: profile } = await supabase
    .from('profiles')
    .update({ display_name, bio, club, coaching_level })
    .eq('id', user.id)
    .select('username')
    .single()

  // Upsert non-empty social links, delete empty ones
  for (const platform of SOCIAL_PLATFORMS) {
    const url = (formData.get(`social_${platform}`) as string)?.trim()
    if (url) {
      await supabase
        .from('social_links')
        .upsert({ user_id: user.id, platform, url }, { onConflict: 'user_id,platform' })
    } else {
      await supabase
        .from('social_links')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', platform)
    }
  }

  revalidatePath('/profile')
  revalidatePath(`/profile/${profile?.username}`)
  revalidatePath('/', 'layout')
}

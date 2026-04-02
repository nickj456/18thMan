'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function createClub(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Club name is required' }

  const slug = toSlug(name)

  const { data: club, error } = await supabase
    .from('clubs')
    .insert({ name, slug, created_by: user.id })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'A club with that name already exists' }
    return { error: error.message }
  }

  revalidatePath('/admin/clubs')
  redirect(`/admin/clubs/${club.id}`)
}

export async function inviteUserToClub(clubId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  // Check user isn't already in a club
  const { data: target } = await supabase
    .from('profiles')
    .select('id, display_name, username, club_id')
    .eq('id', userId)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.club_id) return { error: 'User is already a member of a club' }

  // Upsert invitation — allows re-inviting after decline
  const { error } = await supabase
    .from('club_invitations')
    .upsert(
      { club_id: clubId, user_id: userId, invited_by: user.id, status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'club_id,user_id' }
    )

  if (error) return { error: error.message }

  // Fetch club name + admin display name for notification
  const [{ data: club }, { data: inviter }] = await Promise.all([
    supabase.from('clubs').select('name').eq('id', clubId).single(),
    supabase.from('profiles').select('display_name, username').eq('id', user.id).single(),
  ])

  await createNotification(supabase, {
    userId,
    type: 'club_invite',
    data: {
      club_id: clubId,
      club_name: club?.name ?? '',
      invited_by_display_name: inviter?.display_name ?? inviter?.username ?? 'Admin',
    },
  })

  revalidatePath(`/admin/clubs/${clubId}`)
  return { success: true }
}

export async function removeUserFromClub(clubId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  await supabase.from('profiles').update({ club_id: null }).eq('id', userId)
  await supabase.from('club_invitations').delete().eq('club_id', clubId).eq('user_id', userId)

  revalidatePath(`/admin/clubs/${clubId}`)
  return { success: true }
}

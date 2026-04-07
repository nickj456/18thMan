'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createNotification } from '@/lib/notifications'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, supabase, user: null }
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' as const, supabase, user: null }
  return { error: null, supabase, user }
}

export async function createClub(formData: FormData) {
  const { error, user } = await requireAdmin()
  if (error || !user) return { error }

  const supabase = await createClient()
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Club name is required' }

  const slug = toSlug(name)

  const { data: club, error: dbErr } = await supabase
    .from('clubs')
    .insert({ name, slug, created_by: user.id })
    .select('id')
    .single()

  if (dbErr) {
    if (dbErr.code === '23505') return { error: 'A club with that name already exists' }
    return { error: dbErr.message }
  }

  revalidatePath('/admin/clubs')
  redirect(`/admin/clubs/${club.id}`)
}

export async function inviteUserToClub(clubId: string, userId: string) {
  const { error, user } = await requireAdmin()
  if (error || !user) return { error }

  const supabase = await createClient()

  const { data: target } = await supabase
    .from('profiles')
    .select('id, display_name, username, club_id')
    .eq('id', userId)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.club_id) return { error: 'User is already a member of a club' }

  const { error: invErr } = await supabase
    .from('club_invitations')
    .upsert(
      { club_id: clubId, user_id: userId, invited_by: user.id, status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'club_id,user_id' }
    )

  if (invErr) return { error: invErr.message }

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
  const { error } = await requireAdmin()
  if (error) return { error }

  const service = createServiceClient()
  await service.from('profiles').update({ club_id: null, club_role: null }).eq('id', userId)
  await service.from('club_invitations').delete().eq('club_id', clubId).eq('user_id', userId)

  revalidatePath(`/admin/clubs/${clubId}`)
  return { success: true }
}

/** Promote a club member to club admin. Demotes any existing club admin first. */
export async function setClubAdmin(clubId: string, userId: string) {
  const { error } = await requireAdmin()
  if (error) return { error }

  const service = createServiceClient()

  // Demote existing club admin (if any)
  await service
    .from('profiles')
    .update({ club_role: 'member' })
    .eq('club_id', clubId)
    .eq('club_role', 'admin')

  // Promote the new admin
  const { error: promoteErr } = await service
    .from('profiles')
    .update({ club_role: 'admin' })
    .eq('id', userId)
    .eq('club_id', clubId)

  if (promoteErr) return { error: promoteErr.message }

  revalidatePath(`/admin/clubs/${clubId}`)
  return { success: true }
}

/** Demote a club admin back to member. */
export async function removeClubAdmin(clubId: string, userId: string) {
  const { error } = await requireAdmin()
  if (error) return { error }

  const service = createServiceClient()
  const { error: demoteErr } = await service
    .from('profiles')
    .update({ club_role: 'member' })
    .eq('id', userId)
    .eq('club_id', clubId)

  if (demoteErr) return { error: demoteErr.message }

  revalidatePath(`/admin/clubs/${clubId}`)
  return { success: true }
}

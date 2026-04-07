'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createNotification } from '@/lib/notifications'

export async function acceptClubInvite(invitationId: string, clubId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: invErr } = await supabase
    .from('club_invitations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('user_id', user.id)

  if (invErr) return { error: invErr.message }

  // Set club_id and club_role='member' on profile
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ club_id: clubId, club_role: 'member' })
    .eq('id', user.id)

  if (profErr) return { error: profErr.message }

  revalidatePath('/clubs')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function declineClubInvite(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('club_invitations')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/clubs')
  return { success: true }
}

// ── Club admin actions ────────────────────────────────────────────────────────

/** Verify the current user is a club admin for the given club. */
async function requireClubAdmin(clubId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, supabase, user: null }

  const { data: me } = await supabase
    .from('profiles')
    .select('club_id, club_role')
    .eq('id', user.id)
    .single()

  if (me?.club_id !== clubId || me?.club_role !== 'admin') {
    return { error: 'Not authorised' as const, supabase, user: null }
  }

  return { error: null, supabase, user }
}

export async function clubAdminInviteUser(clubId: string, userId: string) {
  const { error, user } = await requireClubAdmin(clubId)
  if (error || !user) return { error: error ?? 'Not authorised' }

  const supabase = await createClient()

  // Check target isn't already in a club
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
      invited_by_display_name: inviter?.display_name ?? inviter?.username ?? 'Club Admin',
    },
  })

  revalidatePath('/clubs')
  return { success: true }
}

export async function clubAdminRemoveMember(clubId: string, userId: string) {
  const { error, user } = await requireClubAdmin(clubId)
  if (error || !user) return { error: error ?? 'Not authorised' }

  // Can't remove yourself
  if (userId === user.id) return { error: 'You cannot remove yourself. Transfer the admin role first.' }

  // Use service client so we can clear club_id/club_role on another user's profile
  const service = createServiceClient()
  await service.from('profiles').update({ club_id: null, club_role: null }).eq('id', userId)
  await service.from('club_invitations').delete().eq('club_id', clubId).eq('user_id', userId)

  revalidatePath('/clubs')
  return { success: true }
}

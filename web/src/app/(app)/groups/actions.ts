'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { getEffectiveTier, hasClubAccess } from '@/lib/subscription'
import { sendUpgradeNudgeEmail } from '@/lib/email'

export async function createGroup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase
    .from('profiles')
    .select('role, club_role, club_id, display_name, username')
    .eq('id', user.id)
    .single()

  if (!me?.club_id) return { error: 'You must be a member of a club to create a group' }
  if (me.club_role !== 'admin' && me.role !== 'admin') return { error: 'Only club admins can create groups' }

  // Feature gate: coaching groups require a club subscription (not just Coach Pro)
  const tier = await getEffectiveTier(supabase, user.id)
  if (!hasClubAccess(tier)) {
    if (user.email) {
      after(async () => { await sendUpgradeNudgeEmail(user.email!, me?.display_name ?? '', 'Coaching Groups') })
    }
    return { error: 'Coaching groups require a club subscription. Upgrade to unlock this feature.' }
  }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Group name is required' }

  const { data: group, error } = await supabase
    .from('coaching_groups')
    .insert({ name, club_id: me.club_id, created_by: user.id })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('maximum of 5')) return { error: 'This club already has 5 groups (the maximum)' }
    return { error: error.message }
  }

  // Auto-accept the creator as a member
  await supabase.from('group_invitations').insert({
    group_id: group.id,
    user_id: user.id,
    invited_by: user.id,
    status: 'accepted',
  })

  revalidatePath('/groups')
  redirect(`/groups/${group.id}`)
}

export async function inviteUserToGroup(groupId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase
    .from('profiles')
    .select('role, club_role, club_id, display_name, username')
    .eq('id', user.id)
    .single()

  const isClubAdmin = me?.club_role === 'admin'
  const isPlatformAdmin = me?.role === 'admin'
  if (!isClubAdmin && !isPlatformAdmin) return { error: 'Only club admins can invite members' }

  // Verify group is in the same club
  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', groupId)
    .single()

  if (!group) return { error: 'Group not found' }
  if (group.club_id !== me?.club_id && !isPlatformAdmin) return { error: 'Not authorised' }

  // Check the user being invited is in the same club (or admin can invite anyone)
  const { data: target } = await supabase
    .from('profiles')
    .select('id, display_name, username, club_id')
    .eq('id', userId)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.club_id !== group.club_id) return { error: 'User must be in the same club' }

  // Upsert — allows re-inviting after decline
  const { error } = await supabase
    .from('group_invitations')
    .upsert(
      { group_id: groupId, user_id: userId, invited_by: user.id, status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'group_id,user_id' }
    )

  if (error) return { error: error.message }

  await createNotification(supabase, {
    userId,
    type: 'group_invite',
    data: {
      group_id: groupId,
      group_name: group.name,
      invited_by_display_name: me?.display_name ?? me?.username ?? 'Coach',
    },
  })

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function removeUserFromGroup(groupId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role, club_role').eq('id', user.id).single()
  if (me?.club_role !== 'admin' && me?.role !== 'admin') return { error: 'Not authorised' }

  const { error } = await supabase
    .from('group_invitations')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function acceptGroupInvite(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/groups')
  revalidatePath('/', 'layout')
  return { success: true }
}

/** Platform admin only: add a user directly to a group (accepted, no invite flow). */
export async function addUserToGroupDirect(groupId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  const { data: group } = await supabase.from('coaching_groups').select('id, name, club_id').eq('id', groupId).single()
  if (!group) return { error: 'Group not found' }

  const { error } = await supabase
    .from('group_invitations')
    .upsert(
      { group_id: groupId, user_id: userId, invited_by: user.id, status: 'accepted', updated_at: new Date().toISOString() },
      { onConflict: 'group_id,user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/admin/groups/${groupId}`)
  return { success: true }
}

/** Platform admin only: set a group member as group admin. */
export async function setGroupAdmin(groupId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { error } = await service
    .from('group_invitations')
    .update({ group_role: 'admin' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (error) return { error: error.message }

  revalidatePath(`/admin/groups/${groupId}`)
  return { success: true }
}

/** Platform admin only: remove group admin role from a member. */
export async function removeGroupAdmin(groupId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Not authorised' }

  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { error } = await service
    .from('group_invitations')
    .update({ group_role: null })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/groups/${groupId}`)
  return { success: true }
}

export async function declineGroupInvite(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/groups')
  return { success: true }
}

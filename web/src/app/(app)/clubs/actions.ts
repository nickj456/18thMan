'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function acceptClubInvite(invitationId: string, clubId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Update invitation status
  const { error: invErr } = await supabase
    .from('club_invitations')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('user_id', user.id)

  if (invErr) return { error: invErr.message }

  // Set club_id on profile
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ club_id: clubId })
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

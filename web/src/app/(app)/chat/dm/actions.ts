'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Start or resume a DM with another user. Returns the conversation id. */
export async function startDm(otherUserId: string) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }
  if (otherUserId === user.id) return { error: "You can't message yourself" }

  // Check if a DM between these two already exists
  // Get all DM conversation IDs the current user is in
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id, conversations!inner(id, type)')
    .eq('user_id', user.id)
    .eq('conversations.type', 'dm')

  const myConvIds = (myConvs ?? []).map(p => p.conversation_id)

  if (myConvIds.length > 0) {
    // Check if the other user is in any of those conversations
    const { data: shared } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myConvIds)
      .limit(1)
      .single()

    if (shared) {
      redirect(`/chat/dm/${shared.conversation_id}`)
    }
  }

  // Create new DM conversation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type: 'dm', created_by: user.id })
    .select('id')
    .single()

  if (convErr || !conv) return { error: convErr?.message ?? 'Failed to create conversation' }

  // Use service client to insert both participants — RLS only allows inserting
  // your own user_id, so we need service role to add the other participant
  const service = createServiceClient()
  const { error: partErr } = await service
    .from('conversation_participants')
    .insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUserId },
    ])

  if (partErr) return { error: partErr.message }

  revalidatePath('/chat/dm')
  redirect(`/chat/dm/${conv.id}`)
}

/** Send a message in a DM conversation */
export async function sendDmMessage(conversationId: string, content: string) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!participant) return { error: 'Not a participant' }

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })

  if (error) return { error: error.message }

  revalidatePath(`/chat/dm/${conversationId}`)
  return { success: true }
}

/** Mark a DM as read (update last_read_at for current user) */
export async function markDmRead(conversationId: string) {
  const { supabase, user } = await getUser()
  if (!user) return

  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
}

/** Delete a DM message (own messages only) */
export async function deleteDmMessage(messageId: string) {
  const { supabase, user } = await getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

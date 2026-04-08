'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, conversation_participants!inner(user_id)')
    .eq('type', 'dm')
    .eq('conversation_participants.user_id', user.id)

  for (const conv of existing ?? []) {
    // Check if the other user is also a participant
    const { data: otherParticipant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conv.id)
      .eq('user_id', otherUserId)
      .single()

    if (otherParticipant) {
      redirect(`/chat/dm/${conv.id}`)
    }
  }

  // Create new DM conversation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type: 'dm', created_by: user.id })
    .select('id')
    .single()

  if (convErr || !conv) return { error: convErr?.message ?? 'Failed to create conversation' }

  // Add both participants
  const { error: partErr } = await supabase
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

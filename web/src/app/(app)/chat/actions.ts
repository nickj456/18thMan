'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, profile }
}

export async function createThread(title: string, firstMessage: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }
  if (!profile || profile.role === 'viewer') return { error: 'Coaches only' }

  const { data: thread, error: threadError } = await supabase
    .from('conversations')
    .insert({ title: title.trim(), type: 'community', created_by: user.id })
    .select('id')
    .single()

  if (threadError) return { error: threadError.message }

  await supabase
    .from('conversation_participants')
    .insert({ conversation_id: thread.id, user_id: user.id })

  const { error: msgError } = await supabase
    .from('messages')
    .insert({ conversation_id: thread.id, sender_id: user.id, content: firstMessage.trim() })

  if (msgError) return { error: msgError.message }

  revalidatePath('/chat/community')
  redirect(`/chat/community/${thread.id}`)
}

export async function postReply(conversationId: string, content: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }
  if (!profile || profile.role === 'viewer') return { error: 'Coaches only' }

  // Check thread isn't closed
  const { data: conv } = await supabase
    .from('conversations')
    .select('is_closed')
    .eq('id', conversationId)
    .single()
  if (conv?.is_closed && profile.role !== 'admin') return { error: 'This thread is closed' }

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })

  if (error) return { error: error.message }

  revalidatePath(`/chat/community/${conversationId}`)
  return { success: true }
}

export async function deleteMessage(messageId: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const isAdmin = profile?.role === 'admin'
  const query = supabase.from('messages').delete().eq('id', messageId)

  // Admins can delete any message; others only their own
  const { error } = await (isAdmin ? query : query.eq('sender_id', user.id))

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteThread(id: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  const isAdmin = profile?.role === 'admin'
  const query = supabase.from('conversations').delete().eq('id', id)

  const { error } = await (isAdmin ? query : query.eq('created_by', user.id))
  if (error) return { error: error.message }

  revalidatePath('/chat/community')
  redirect('/chat/community')
}

export async function toggleCloseThread(id: string, isClosed: boolean) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user || profile?.role !== 'admin') return { error: 'Admins only' }

  const { error } = await supabase
    .from('conversations')
    .update({ is_closed: isClosed })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/chat/community/${id}`)
  revalidatePath('/chat/community')
  return { success: true }
}

export async function togglePinThread(id: string, isPinned: boolean) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user || profile?.role !== 'admin') return { error: 'Admins only' }

  const { error } = await supabase
    .from('conversations')
    .update({ is_pinned: isPinned })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/chat/community')
  return { success: true }
}

export async function editThreadTitle(id: string, title: string) {
  const { supabase, user, profile } = await getAuthenticatedUser()
  if (!user || profile?.role !== 'admin') return { error: 'Admins only' }

  const { error } = await supabase
    .from('conversations')
    .update({ title: title.trim() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/chat/community/${id}`)
  revalidatePath('/chat/community')
  return { success: true }
}

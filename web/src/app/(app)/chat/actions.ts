'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { extractUrl, fetchLinkPreview } from '@/lib/link-preview'
import { canCreateSession } from '@/lib/subscription'

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

export async function postReply(
  conversationId: string,
  content: string,
  linkPreview?: { url: string; title: string | null; description: string | null; image: string | null; domain: string } | null,
) {
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

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      link_preview: linkPreview ?? null,
    })
    .select('id')
    .single()

  if (error || !msg) return { error: error?.message ?? 'Failed to post' }

  // If no preview was pre-fetched, try in the background as fallback
  const url = !linkPreview ? extractUrl(content) : null
  if (url) {
    const messageId = msg.id
    after(async () => {
      const preview = await fetchLinkPreview(url)
      if (preview) {
        const service = createServiceClient()
        await service
          .from('messages')
          .update({ link_preview: preview })
          .eq('id', messageId)
      }
    })
  }

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

export async function toggleReaction(messageId: string, reaction: 'like' | 'love') {
  const { supabase, user } = await getAuthenticatedUser()
  if (!user) return { error: 'Not authenticated' }

  // Check if user already has a reaction on this message
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('reaction')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    // No reaction yet — insert
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: user.id, reaction })
    if (error) return { error: error.message }
  } else if (existing.reaction === reaction) {
    // Same reaction — remove (toggle off)
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    // Different reaction — switch
    const { error } = await supabase
      .from('message_reactions')
      .update({ reaction })
      .eq('message_id', messageId)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function saveSessionFromChat(content: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { allowed } = await canCreateSession(supabase, user.id)
  if (!allowed) return { error: 'Session limit reached. Upgrade your club for unlimited sessions.' }

  // Extract title from first markdown heading, falling back to first non-empty line
  const headingMatch = content.match(/#{1,3}\s+(.+?)(?:\n|$)/)
  const firstLine = content.split('\n').find(l => l.trim().length > 0) ?? ''
  const rawTitle = (headingMatch?.[1] ?? firstLine).replace(/[#*`]/g, '').trim()
  const title = rawTitle.slice(0, 100) ||
    `AI Session – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const { data, error } = await supabase
    .from('session_plans')
    .insert({
      title,
      coach_id: user.id,
      drills_order: [],
      ai_summary: { content, generated_from_chat: true },
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to save session' }
  revalidatePath('/sessions')
  return { id: data.id }
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

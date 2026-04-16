import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScChat } from '@/components/sc/ScChat'

export const metadata = {
  title: 'S&C Coach — 18th Man',
}

export default async function ScChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Find or create the S&C AI conversation for this user
  let conversationId: string | null = null

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('created_by', user.id)
    .eq('type', 'ai')
    .eq('title', 'S&C Coach')
    .maybeSingle()

  if (existing) {
    conversationId = existing.id
  } else {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ type: 'ai', created_by: user.id, title: 'S&C Coach' })
      .select('id')
      .single()
    if (error) console.error('[ScChatPage] failed to create conversation:', error.message)
    if (newConv) {
      await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: user.id })
    }
    conversationId = newConv?.id ?? null
  }

  // Load message history
  const initialMessages: { id: string; role: 'user' | 'assistant'; content: string }[] = []

  if (conversationId) {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)

    for (const m of messages ?? []) {
      initialMessages.push({
        id: m.id,
        role: m.sender_id === null ? 'assistant' : 'user',
        content: m.content,
      })
    }
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col max-w-3xl mx-auto">
      <div className="flex-shrink-0 pb-4">
        <h1 className="app-heading text-2xl">S&amp;C Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI strength &amp; conditioning specialist — gym sessions, training blocks, and in-season maintenance for rugby league
        </p>
      </div>
      {conversationId ? (
        <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <ScChat
            conversationId={conversationId}
            initialMessages={initialMessages}
            userAvatar={profile?.avatar_url ?? null}
            userName={profile?.display_name ?? null}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
          Could not start S&amp;C chat. Please refresh the page.
        </div>
      )}
    </div>
  )
}

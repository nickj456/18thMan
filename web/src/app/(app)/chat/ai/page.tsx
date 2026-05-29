import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AiChat } from '@/components/chat/AiChat'

export default async function AiChatPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>
}) {
  const { prompt } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load coach's groups for squad context button
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, club_id')
    .eq('id', user.id)
    .single()

  let squadGroups: { id: string; name: string; playerCount: number }[] = []
  if (profile?.club_id) {
    const { data: memberGroups } = await supabase
      .from('group_invitations')
      .select('group_id, coaching_groups!group_invitations_group_id_fkey(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'accepted')

    if (memberGroups?.length) {
      const groupIds = memberGroups.map(g => g.group_id)
      const { data: playerCounts } = await supabase
        .from('players')
        .select('group_id')
        .in('group_id', groupIds)

      squadGroups = memberGroups.map(mg => {
        const g = Array.isArray(mg.coaching_groups) ? mg.coaching_groups[0] : mg.coaching_groups
        const grp = g as { id: string; name: string } | null
        return {
          id: mg.group_id,
          name: grp?.name ?? mg.group_id,
          playerCount: playerCounts?.filter(p => p.group_id === mg.group_id).length ?? 0,
        }
      }).filter(g => g.playerCount > 0)
    }
  }

  // Find or create the AI conversation for this user
  let conversationId: string | null = null

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('created_by', user.id)
    .eq('type', 'ai')
    .maybeSingle()

  if (existing) {
    conversationId = existing.id
  } else {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ type: 'ai', created_by: user.id, title: 'AI Coach' })
      .select('id')
      .single()
    if (error) console.error('[AiChatPage] failed to create conversation:', error.message)
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
        <h1 className="app-heading text-2xl">AI Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal rugby league coaching assistant</p>
      </div>
      {conversationId ? (
        <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <AiChat
            conversationId={conversationId}
            initialMessages={initialMessages}
            userAvatar={profile?.avatar_url ?? null}
            userName={profile?.display_name ?? null}
            pendingPrompt={prompt ? decodeURIComponent(prompt) : undefined}
            squadGroups={squadGroups}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
          Could not start AI chat. Please refresh the page.
        </div>
      )}
    </div>
  )
}

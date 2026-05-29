import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Lock, Pin } from 'lucide-react'
import { ThreadView } from '@/components/chat/ThreadView'
import { AdminThreadControls } from '@/components/chat/AdminThreadControls'

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const canPost = profile?.role === 'coach' || profile?.role === 'admin'

  const { data: thread } = await supabase
    .from('conversations')
    .select('id, title, created_at, created_by, is_closed, is_pinned')
    .eq('id', id)
    .eq('type', 'community')
    .single()

  if (!thread) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('id, content, created_at, sender_id, link_preview, author:profiles!messages_sender_id_fkey ( display_name, username, avatar_url )')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const messageIds = (messages ?? []).map(m => m.id)
  const { data: reactionsData } = messageIds.length > 0
    ? await supabase.from('message_reactions').select('message_id, user_id, reaction').in('message_id', messageIds)
    : { data: [] }

  // Build reactions map: messageId → { like: number, love: number, mine: type | null }
  type ReactionSummary = { like: number; love: number; mine: 'like' | 'love' | null }
  const reactionsMap: Record<string, ReactionSummary> = {}
  for (const r of reactionsData ?? []) {
    if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = { like: 0, love: 0, mine: null }
    reactionsMap[r.message_id][r.reaction as 'like' | 'love']++
    if (r.user_id === user.id) reactionsMap[r.message_id].mine = r.reaction as 'like' | 'love'
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/chat/community"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Community Board
      </Link>

      {isAdmin && (
        <AdminThreadControls
          threadId={thread.id}
          title={thread.title ?? ''}
          isClosed={thread.is_closed ?? false}
          isPinned={thread.is_pinned ?? false}
        />
      )}

      <div>
        <div className="flex items-start gap-2 flex-wrap">
          {thread.is_pinned && (
            <Pin size={14} className="text-indigo-400 mt-1.5 flex-shrink-0" />
          )}
          <h1 className="app-heading text-2xl">{thread.title}</h1>
          {thread.is_closed && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 mt-1.5 flex-shrink-0">
              <Lock size={10} /> Closed
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          Started {new Date(thread.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <ThreadView
        conversationId={id}
        initialMessages={(messages ?? []) as unknown as Parameters<typeof ThreadView>[0]['initialMessages']}
        currentUserId={user.id}
        isAdmin={isAdmin}
        canPost={canPost && !thread.is_closed}
        isClosed={thread.is_closed ?? false}
        initialReactions={reactionsMap}
      />
    </div>
  )
}

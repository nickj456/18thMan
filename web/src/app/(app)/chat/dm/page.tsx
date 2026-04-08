import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { MessageSquare, User, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Direct Messages — 18th Man' }

export default async function DmListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  // Use service client to bypass RLS for reading participant/conversation data
  const { data: participations } = await service
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id)

  const allConvIds = (participations ?? []).map(p => p.conversation_id)

  const { data: dmConvs } = allConvIds.length
    ? await service
        .from('conversations')
        .select('id')
        .eq('type', 'dm')
        .in('id', allConvIds)
    : { data: [] }

  const convIds = (dmConvs ?? []).map(c => c.id)

  if (!convIds.length) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">Direct Messages</h1>
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <MessageSquare size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No messages yet.</p>
          <p className="text-xs text-zinc-600">Visit a coach&apos;s profile to start a conversation.</p>
        </div>
      </div>
    )
  }

  // For each conversation, get the other participant and latest message
  const { data: allParticipants } = await service
    .from('conversation_participants')
    .select('conversation_id, user_id, last_read_at, profiles!inner(id, display_name, username, avatar_url)')
    .in('conversation_id', convIds)
    .neq('user_id', user.id)

  const { data: lastMessages } = await service
    .from('messages')
    .select('conversation_id, content, created_at, sender_id')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })

  // Build a lookup of last message per conversation
  const lastMsgByConv: Record<string, { content: string; created_at: string; sender_id: string | null }> = {}
  for (const msg of lastMessages ?? []) {
    if (!lastMsgByConv[msg.conversation_id]) {
      lastMsgByConv[msg.conversation_id] = msg
    }
  }

  // Build a lookup of my last_read_at per conversation
  const myLastRead: Record<string, string> = {}
  for (const p of participations ?? []) {
    if (convIds.includes(p.conversation_id)) {
      myLastRead[p.conversation_id] = p.last_read_at
    }
  }

  // Build conversation list
  const conversations = (allParticipants ?? []).map(p => {
    const other = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
    const lastMsg = lastMsgByConv[p.conversation_id]
    const lastRead = myLastRead[p.conversation_id]
    const hasUnread = lastMsg && lastRead && new Date(lastMsg.created_at) > new Date(lastRead) && lastMsg.sender_id !== user.id

    return {
      conversationId: p.conversation_id,
      other: other as { id: string; display_name: string | null; username: string; avatar_url: string | null },
      lastMsg,
      hasUnread,
    }
  }).sort((a, b) => {
    const aTime = a.lastMsg?.created_at ?? ''
    const bTime = b.lastMsg?.created_at ?? ''
    return bTime.localeCompare(aTime)
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="app-heading text-2xl">Direct Messages</h1>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <ul className="divide-y divide-zinc-800 bg-zinc-900">
          {conversations.map(({ conversationId, other, lastMsg, hasUnread }) => (
            <li key={conversationId}>
              <Link
                href={`/chat/dm/${conversationId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/50 transition-colors"
              >
                {other?.avatar_url ? (
                  <Image
                    src={other.avatar_url}
                    alt={other.display_name ?? other.username}
                    width={40}
                    height={40}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <User size={18} className="text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-zinc-200'}`}>
                      {other?.display_name ?? other?.username ?? 'Coach'}
                    </p>
                    {lastMsg && (
                      <span className="text-xs text-zinc-600 shrink-0">
                        {new Date(lastMsg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs truncate ${hasUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {lastMsg ? lastMsg.content : 'No messages yet'}
                    </p>
                    {hasUnread && (
                      <span className="size-2 rounded-full bg-[#e8560a] shrink-0" />
                    )}
                  </div>
                </div>
                <ArrowRight size={14} className="text-zinc-600 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

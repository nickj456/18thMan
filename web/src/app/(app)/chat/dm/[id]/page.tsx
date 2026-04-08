import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ArrowLeft, User } from 'lucide-react'
import { DmView } from '@/components/chat/DmView'

export const dynamic = 'force-dynamic'

export default async function DmConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const service = createServiceClient()

  // Verify this is a DM and user is a participant (service client bypasses RLS)
  const { data: conv } = await service
    .from('conversations')
    .select('id, type')
    .eq('id', id)
    .eq('type', 'dm')
    .single()

  if (!conv) notFound()

  const { data: myParticipation } = await service
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myParticipation) notFound()

  // Get the other participant
  const { data: otherParticipant } = await service
    .from('conversation_participants')
    .select('profiles!inner(id, display_name, username, avatar_url)')
    .eq('conversation_id', id)
    .neq('user_id', user.id)
    .single()

  const other = otherParticipant
    ? (Array.isArray(otherParticipant.profiles) ? otherParticipant.profiles[0] : otherParticipant.profiles) as { id: string; display_name: string | null; username: string; avatar_url: string | null }
    : null

  // Load messages
  const { data: messages } = await service
    .from('messages')
    .select('id, content, created_at, sender_id, author:profiles!messages_sender_id_fkey ( display_name, username, avatar_url )')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-zinc-800 mb-4 shrink-0">
        <Link
          href="/chat/dm"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        {other?.avatar_url ? (
          <Image
            src={other.avatar_url}
            alt={other.display_name ?? other.username}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="size-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <User size={16} className="text-zinc-500" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white">{other?.display_name ?? other?.username ?? 'Coach'}</p>
          {other?.username && (
            <Link href={`/profile/${other.username}`} className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
              @{other.username}
            </Link>
          )}
        </div>
      </div>

      <DmView
        conversationId={id}
        initialMessages={(messages ?? []) as unknown as Parameters<typeof DmView>[0]['initialMessages']}
        currentUserId={user.id}
      />
    </div>
  )
}

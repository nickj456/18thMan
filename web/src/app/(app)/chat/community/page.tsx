import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { MessageSquare, Clock, Pin, Lock } from 'lucide-react'
import { NewThreadDialog } from '@/components/chat/NewThreadDialog'
import type { UserRole } from '@/lib/supabase/types'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const canPost = profile?.role === 'coach' || profile?.role === 'admin'

  const { data: threads } = await supabase
    .from('conversations')
    .select(`
      id, title, created_at, updated_at, is_closed, is_pinned,
      author:profiles!conversations_created_by_fkey ( display_name, username ),
      messages ( id )
    `)
    .eq('type', 'community')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  const pinned = (threads ?? []).filter((t: any) => t.is_pinned)
  const rest = (threads ?? []).filter((t: any) => !t.is_pinned)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discuss drills, tactics, and coaching with the community
          </p>
        </div>
        {canPost && <NewThreadDialog />}
      </div>

      {(!threads || threads.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-medium">No discussions yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Be the first to start a conversation
          </p>
          {canPost && <NewThreadDialog />}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned threads */}
          {pinned.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pin size={11} /> Pinned
              </p>
              <ThreadList threads={pinned} />
            </div>
          )}

          {/* All other threads */}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Discussions</p>
              )}
              <ThreadList threads={rest} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThreadList({ threads }: { threads: any[] }) {
  return (
    <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/chat/community/${thread.id}`}
          className="flex items-center gap-4 px-5 py-4 bg-zinc-900 hover:bg-zinc-800 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            {thread.is_closed
              ? <Lock size={16} className="text-zinc-500" />
              : <MessageSquare size={18} className="text-indigo-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium group-hover:text-white transition-colors line-clamp-1">
                {thread.title ?? 'Untitled'}
              </p>
              {thread.is_pinned && (
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                  Pinned
                </span>
              )}
              {thread.is_closed && (
                <span className="text-[10px] text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded flex-shrink-0">
                  Closed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>by {thread.author?.display_name ?? thread.author?.username ?? 'Coach'}</span>
              <span>·</span>
              <span>{thread.messages?.length ?? 0} {thread.messages?.length === 1 ? 'reply' : 'replies'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0">
            <Clock size={11} />
            {new Date(thread.updated_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short',
            })}
          </div>
        </Link>
      ))}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, Trash2, Lock, X } from 'lucide-react'
import { postReply, deleteMessage, toggleReaction } from '@/app/(app)/chat/actions'
import { toast } from 'sonner'
import { extractUrl } from '@/lib/link-preview'
import type { LinkPreview } from '@/lib/link-preview'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string | null
  link_preview: LinkPreview | null
  author: { display_name: string | null; username: string; avatar_url: string | null } | null
}

type ReactionSummary = { like: number; love: number; mine: 'like' | 'love' | null }

interface ThreadViewProps {
  conversationId: string
  initialMessages: Message[]
  initialReactions?: Record<string, ReactionSummary>
  currentUserId: string
  canPost: boolean
  isAdmin?: boolean
  isClosed?: boolean
}

export function ThreadView({ conversationId, initialMessages, initialReactions = {}, currentUserId, canPost, isAdmin = false, isClosed = false }: ThreadViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [reactions, setReactions] = useState<Record<string, ReactionSummary>>(initialReactions)
  const [reply, setReply] = useState('')
  const [isPending, startTransition] = useTransition()
  const [inputPreview, setInputPreview] = useState<LinkPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // Real-time subscription — INSERT for new messages, UPDATE for link_preview arriving
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('id, content, created_at, sender_id, link_preview, author:profiles!messages_sender_id_fkey ( display_name, username, avatar_url )')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            const msg = data as unknown as Message
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              // Replace optimistic placeholder
              const tempIdx = prev.findLastIndex(
                m => m.id.startsWith('temp-') && m.sender_id === msg.sender_id && m.content === msg.content
              )
              if (tempIdx !== -1) {
                const next = [...prev]
                next[tempIdx] = msg
                return next
              }
              return [...prev, msg]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          // Link preview arrived — patch the message in state
          if (payload.new.link_preview) {
            setMessages(prev => prev.map(m =>
              m.id === payload.new.id ? { ...m, link_preview: payload.new.link_preview } : m
            ))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  // Real-time reactions
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const msgId: string = (payload.new as { message_id?: string })?.message_id
            ?? (payload.old as { message_id?: string })?.message_id ?? ''
          if (!msgId) return
          // Refetch reaction counts for this message
          const { data } = await supabase
            .from('message_reactions')
            .select('user_id, reaction')
            .eq('message_id', msgId)
          const summary: ReactionSummary = { like: 0, love: 0, mine: null }
          for (const r of data ?? []) {
            summary[r.reaction as 'like' | 'love']++
            if (r.user_id === currentUserId) summary.mine = r.reaction as 'like' | 'love'
          }
          setReactions(prev => ({ ...prev, [msgId]: summary }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect URL in reply box and fetch preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const url = extractUrl(reply)
    if (!url || url === dismissedUrl) {
      if (!url) { setInputPreview(null); setPreviewLoading(false) }
      return
    }
    if (inputPreview?.url === url) return // already fetched
    setPreviewLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (res.ok) {
          const data = await res.json()
          setInputPreview(data)
        } else {
          setInputPreview(null)
        }
      } catch {
        setInputPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reply])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    const content = reply.trim()
    const preview = inputPreview ?? null
    setReply('')
    setInputPreview(null)
    setDismissedUrl(null)

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      link_preview: preview,
      author: null,
    }])

    startTransition(async () => {
      const result = await postReply(conversationId, content, preview)
      if (result?.error) {
        toast.error(result.error)
        setMessages(prev => prev.filter(m => m.id !== tempId))
      }
    })
  }

  function handleDelete(messageId: string) {
    if (messageId.startsWith('temp-')) return // not yet saved
    if (!window.confirm('Delete this message?')) return
    startTransition(async () => {
      const result = await deleteMessage(messageId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId))
      }
    })
  }

  function handleReact(messageId: string, reaction: 'like' | 'love') {
    // Optimistic update
    setReactions(prev => {
      const cur = prev[messageId] ?? { like: 0, love: 0, mine: null }
      const next = { ...cur }
      if (cur.mine === reaction) {
        // Toggle off
        next[reaction] = Math.max(0, cur[reaction] - 1)
        next.mine = null
      } else {
        // Switch or add
        if (cur.mine) next[cur.mine] = Math.max(0, cur[cur.mine] - 1)
        next[reaction] = cur[reaction] + 1
        next.mine = reaction
      }
      return { ...prev, [messageId]: next }
    })
    startTransition(async () => {
      const result = await toggleReaction(messageId, reaction)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (reply.trim() && !isPending) handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      <div className="space-y-4">
        {messages.map((msg, index) => {
          const isCurrentUser = msg.sender_id === currentUserId
          const authorName = msg.author?.display_name ?? msg.author?.username ?? 'Coach'
          const initials = authorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
          const isFirstFromAuthor = index === 0 || messages[index - 1].sender_id !== msg.sender_id

          return (
            <div key={msg.id} className={`flex gap-3 group/msg ${isFirstFromAuthor ? 'mt-4' : 'mt-1'}`}>
              <div className="w-9 flex-shrink-0 mt-0.5">
                {isFirstFromAuthor && (
                  <Avatar size="sm">
                    <AvatarImage src={msg.author?.avatar_url ?? undefined} />
                    <AvatarFallback className={`text-xs font-semibold ${isCurrentUser ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-700 text-zinc-300'}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isFirstFromAuthor && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-sm font-semibold ${isCurrentUser ? 'text-indigo-400' : 'text-zinc-200'}`}>
                      {isCurrentUser ? 'You' : authorName}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {/* Reactions */}
                    {(() => {
                      const r = reactions[msg.id] ?? { like: 0, love: 0, mine: null }
                      const hasAny = r.like > 0 || r.love > 0
                      return (
                        <div className="flex items-center gap-1">
                          {(['like', 'love'] as const).map(type => {
                            const emoji = type === 'like' ? '👍' : '❤️'
                            const count = r[type]
                            const active = r.mine === type
                            return (
                              <button
                                key={type}
                                onClick={() => handleReact(msg.id, type)}
                                disabled={msg.id.startsWith('temp-')}
                                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                                  count === 0 ? 'opacity-0 group-hover/msg:opacity-100' : ''
                                } ${
                                  active
                                    ? 'border-orange-500/60 bg-orange-500/10 text-orange-400'
                                    : 'border-zinc-700 bg-zinc-800/60 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                                }`}
                                title={type === 'like' ? 'Like' : 'Love'}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="tabular-nums">{count}</span>}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                    {msg.link_preview && (
                      <a
                        href={msg.link_preview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-zinc-700 bg-zinc-800/60 overflow-hidden hover:border-zinc-500 transition-colors max-w-sm"
                      >
                        {msg.link_preview.image && (
                          <img
                            src={msg.link_preview.image}
                            alt={msg.link_preview.title ?? ''}
                            className="w-full aspect-video object-cover"
                          />
                        )}
                        <div className="px-3 py-2.5 space-y-0.5">
                          {msg.link_preview.title && (
                            <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{msg.link_preview.title}</p>
                          )}
                          {msg.link_preview.description && (
                            <p className="text-xs text-zinc-400 line-clamp-2">{msg.link_preview.description}</p>
                          )}
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wide pt-0.5">{msg.link_preview.domain}</p>
                        </div>
                      </a>
                    )}
                  </div>
                  {(isCurrentUser || isAdmin) && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      disabled={isPending}
                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 flex-shrink-0 mt-0.5"
                      title="Delete message"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {isClosed && !isAdmin ? (
        <p className="text-sm text-zinc-500 text-center py-4 border-t border-zinc-800 flex items-center justify-center gap-2">
          <Lock size={13} /> This thread has been closed by an admin.
        </p>
      ) : canPost ? (
        <div className="sticky bottom-0 pt-4 border-t border-zinc-800 bg-background space-y-2">
          {/* Link preview card shown while typing */}
          {(inputPreview || previewLoading) && (
            <div className="relative max-w-sm">
              {previewLoading && !inputPreview ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-xs text-zinc-500">
                  <Loader2 size={12} className="animate-spin" /> Fetching preview…
                </div>
              ) : inputPreview ? (
                <div className="flex rounded-xl border border-zinc-700 bg-zinc-800/60 overflow-hidden">
                  {inputPreview.image && (
                    <img
                      src={inputPreview.image}
                      alt=""
                      className="w-20 h-16 object-cover flex-shrink-0"
                    />
                  )}
                  <div className="px-3 py-2 min-w-0 flex-1">
                    {inputPreview.title && (
                      <p className="text-xs font-semibold text-zinc-100 line-clamp-1">{inputPreview.title}</p>
                    )}
                    {inputPreview.description && (
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{inputPreview.description}</p>
                    )}
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">{inputPreview.domain}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDismissedUrl(inputPreview.url); setInputPreview(null) }}
                    className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0 self-start mt-1"
                    title="Remove preview"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : null}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <Textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a reply… (Enter to send)"
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              disabled={isPending}
            />
            <Button type="submit" size="sm" disabled={isPending || !reply.trim()} className="h-10 w-10 p-0 flex-shrink-0">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4 border-t border-zinc-800">
          You need a coach account to reply.
        </p>
      )}

    </div>
  )
}

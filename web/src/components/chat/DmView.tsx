'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, Trash2 } from 'lucide-react'
import { sendDmMessage, deleteDmMessage, markDmRead } from '@/app/(app)/chat/dm/actions'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string | null
  author: { display_name: string | null; username: string; avatar_url: string | null } | null
}

interface DmViewProps {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
}

export function DmView({ conversationId, initialMessages, currentUserId }: DmViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [reply, setReply] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    markDmRead(conversationId)
  }, [conversationId, messages.length])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('id, content, created_at, sender_id, author:profiles!messages_sender_id_fkey ( display_name, username, avatar_url )')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            const msg = data as unknown as Message
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    const content = reply.trim()
    setReply('')
    startTransition(async () => {
      const result = await sendDmMessage(conversationId, content)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleDelete(messageId: string) {
    if (!window.confirm('Delete this message?')) return
    startTransition(async () => {
      const result = await deleteDmMessage(messageId)
      if (result?.error) toast.error(result.error)
      else setMessages(prev => prev.filter(m => m.id !== messageId))
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (reply.trim() && !isPending) handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1 pb-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-12">No messages yet. Say hello!</p>
        )}
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === currentUserId
          const authorName = msg.author?.display_name ?? msg.author?.username ?? 'Coach'
          const initials = authorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
          const isFirstFromAuthor = index === 0 || messages[index - 1].sender_id !== msg.sender_id

          return (
            <div key={msg.id} className={`flex gap-3 group/msg ${isFirstFromAuthor ? 'mt-4' : 'mt-0.5'}`}>
              <div className="w-9 shrink-0 mt-0.5">
                {isFirstFromAuthor && (
                  <Avatar size="sm">
                    <AvatarImage src={msg.author?.avatar_url ?? undefined} />
                    <AvatarFallback className={`text-xs font-semibold ${isMe ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-700 text-zinc-300'}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isFirstFromAuthor && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${isMe ? 'text-indigo-400' : 'text-zinc-200'}`}>
                      {isMe ? 'You' : authorName}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {isMe && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      disabled={isPending}
                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 shrink-0 mt-0.5"
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

      {/* Input */}
      <div className="sticky bottom-0 pt-4 border-t border-zinc-800 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send)"
            className="resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
            disabled={isPending}
          />
          <Button type="submit" size="sm" disabled={isPending || !reply.trim()} className="h-10 w-10 p-0 shrink-0">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </Button>
        </form>
      </div>
    </div>
  )
}

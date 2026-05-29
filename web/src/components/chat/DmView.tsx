'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function shouldShowDateDivider(messages: Message[], index: number) {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].created_at)
  const curr = new Date(messages[index].created_at)
  return prev.toDateString() !== curr.toDateString()
}

function shouldShowTime(messages: Message[], index: number) {
  if (index === messages.length - 1) return true
  const curr = messages[index]
  const next = messages[index + 1]
  // Show time if next message is from different sender or >5 mins later
  if (next.sender_id !== curr.sender_id) return true
  const diff = new Date(next.created_at).getTime() - new Date(curr.created_at).getTime()
  return diff > 5 * 60 * 1000
}

export function DmView({ conversationId, initialMessages, currentUserId }: DmViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [reply, setReply] = useState('')
  const [isPending, startTransition] = useTransition()
  const [pressedId, setPressedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    markDmRead(conversationId)
  }, [conversationId, messages.length])

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
            setMessages(prev => {
              // Already exists (real message) — skip
              if (prev.some(m => m.id === msg.id)) return prev
              // Replace optimistic placeholder from the same sender with matching content
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

    // Optimistic: show the message immediately
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      author: null,
    }])

    startTransition(async () => {
      const result = await sendDmMessage(conversationId, content)
      if (result?.error) {
        toast.error(result.error)
        // Roll back the optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempId))
      }
      // On success the real-time handler replaces the temp entry with the real message
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (reply.trim() && !isPending) handleSubmit(e as unknown as React.FormEvent)
    }
  }

  function handleLongPress(id: string) {
    setPressedId(prev => prev === id ? null : id)
  }

  function handleDelete(messageId: string) {
    setPressedId(null)
    if (!window.confirm('Delete this message?')) return
    startTransition(async () => {
      const result = await deleteDmMessage(messageId)
      if (result?.error) toast.error(result.error)
      else setMessages(prev => prev.filter(m => m.id !== messageId))
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-12">No messages yet. Say hello!</p>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === currentUserId
          const showDate = shouldShowDateDivider(messages, index)
          const showTime = shouldShowTime(messages, index)
          const isPressed = pressedId === msg.id

          const isFirstInGroup = index === 0 || messages[index - 1].sender_id !== msg.sender_id
          const isLastInGroup = index === messages.length - 1 || messages[index + 1].sender_id !== msg.sender_id

          // Bubble border radius: first/last in group get a sharp corner on the sender side
          const radius = isMe
            ? `${isFirstInGroup ? '18px' : '18px'} 4px ${isLastInGroup ? '18px' : '4px'} 18px`
            : `4px ${isFirstInGroup ? '18px' : '18px'} 18px ${isLastInGroup ? '18px' : '4px'}`

          return (
            <div key={msg.id}>
              {/* Date divider */}
              {showDate && (
                <div className="flex items-center justify-center py-4">
                  <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              )}

              {/* Message row */}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
                <div className="max-w-[72%]">
                  <button
                    className="text-left w-full"
                    onClick={() => handleLongPress(msg.id)}
                  >
                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? 'bg-[#e8560a] text-white'
                          : 'bg-zinc-800 text-zinc-100'
                      }`}
                      style={{ borderRadius: radius }}
                    >
                      {msg.content}
                    </div>
                  </button>

                  {/* Timestamp — shown after last in group or when pressed */}
                  {(showTime || isPressed) && (
                    <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[11px] text-zinc-600 px-1">{formatTime(msg.created_at)}</span>
                      {isPressed && isMe && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-[11px] text-red-400 hover:text-red-300 transition-colors px-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pt-3 pb-4 border-t border-zinc-800 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            className="resize-none min-h-[44px] max-h-40 text-sm rounded-2xl px-4"
            rows={1}
            disabled={isPending}
          />
          <Button
            type="submit"
            disabled={isPending || !reply.trim()}
            className="h-10 w-10 p-0 shrink-0 rounded-full bg-[#e8560a] hover:bg-[#d14d09] disabled:opacity-30"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </Button>
        </form>
      </div>
    </div>
  )
}

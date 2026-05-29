'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, MessageSquare, Send } from 'lucide-react'
import { addFocusComment, deleteFocusComment } from './actions'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { display_name: string | null; username: string } | null
}

export function FocusComments({
  focusId,
  initialComments,
  currentUserId,
  canComment,
  isAdmin,
}: {
  focusId: string
  initialComments: Comment[]
  currentUserId: string
  canComment: boolean
  isAdmin: boolean
}) {
  const [comments, setComments] = useState(initialComments)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      focus_id: focusId,
      content: text.trim(),
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      profiles: null,
    } as Comment & { focus_id: string }
    setComments(prev => [...prev, optimistic])
    const saved = text.trim()
    setText('')
    startTransition(async () => {
      const res = await addFocusComment(focusId, saved)
      if (res && 'error' in res) {
        setComments(prev => prev.filter(c => c.id !== optimistic.id))
      }
    })
  }

  function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    startTransition(async () => { await deleteFocusComment(commentId) })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        <MessageSquare size={12} /> Coach Discussion ({comments.length})
      </h2>

      {comments.length === 0 && (
        <p className="text-sm text-zinc-600">No comments yet. Start the discussion.</p>
      )}

      <div className="space-y-2">
        {comments.map(c => {
          const author = c.profiles
          const name = author?.display_name ?? author?.username ?? 'Coach'
          const date = new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          const canDelete = c.user_id === currentUserId || isAdmin

          return (
            <div key={c.id} className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500">{name} · {date}</span>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{c.content}</p>
            </div>
          )
        })}
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            type="submit"
            disabled={!text.trim() || isPending}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </form>
      )}
    </section>
  )
}

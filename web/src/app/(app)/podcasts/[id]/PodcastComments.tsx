'use client'

import { useState, useTransition, useRef } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addPodcastComment, deletePodcastComment } from '@/app/(app)/podcasts/actions'
import { Trash2 } from 'lucide-react'

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface PodcastCommentsProps {
  podcastId: string
  initialComments: Comment[]
  currentUserId: string | null
  currentUserRole: string | null
  currentUserProfile: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function PodcastComments({
  podcastId,
  initialComments,
  currentUserId,
  currentUserRole,
  currentUserProfile,
}: PodcastCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit() {
    if (!text.trim()) return
    setError(null)
    const optimistic: Comment = {
      id: `opt-${Date.now()}`,
      content: text.trim(),
      created_at: new Date().toISOString(),
      user: {
        id: currentUserId ?? '',
        username: currentUserProfile?.username ?? null,
        display_name: currentUserProfile?.display_name ?? null,
        avatar_url: currentUserProfile?.avatar_url ?? null,
      },
    }
    setComments(c => [...c, optimistic])
    const submitted = text.trim()
    setText('')

    startTransition(async () => {
      const result = await addPodcastComment(podcastId, submitted)
      if (result?.error) {
        setError(result.error)
        setComments(c => c.filter(cm => cm.id !== optimistic.id))
        setText(submitted)
      }
    })
  }

  function handleDelete(commentId: string) {
    setComments(c => c.filter(cm => cm.id !== commentId))
    startTransition(async () => {
      const result = await deletePodcastComment(commentId, podcastId)
      if (result?.error) {
        // Re-fetch not implemented here — just show the comment wasn't deleted
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Comments ({comments.length})</h2>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map(comment => {
            const canDelete = currentUserId === comment.user?.id || currentUserRole === 'admin'
            return (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar size="sm">
                  <AvatarImage src={comment.user?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs" style={{ background: 'rgba(232,86,10,0.2)', color: '#e8560a' }}>
                    {initials(comment.user?.display_name ?? comment.user?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {comment.user?.display_name ?? comment.user?.username ?? 'Coach'}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="ml-auto text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add comment form */}
      {currentUserId && (
        <div className="flex gap-3 pt-2">
          <Avatar size="sm">
            <AvatarImage src={currentUserProfile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs" style={{ background: 'rgba(232,86,10,0.2)', color: '#e8560a' }}>
              {initials(currentUserProfile?.display_name ?? currentUserProfile?.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={2}
              className="resize-none text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!text.trim() || isPending}
                onClick={handleSubmit}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

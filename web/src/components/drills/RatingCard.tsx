'use client'

import { useState } from 'react'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Props {
  displayName: string | null
  username: string | null
  avatarUrl: string | null
  rating: number | null
  comment: string | null
}

export function RatingCard({ displayName, username, avatarUrl, rating, comment }: Props) {
  const [open, setOpen] = useState(false)
  const name = displayName ?? username ?? 'Coach'

  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={avatarUrl ?? ''} />
        <AvatarFallback className="text-xs">{name[0]?.toUpperCase() ?? '?'}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{name}</span>
            {rating && (
              <div className="flex">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    className={`size-3 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {comment && (
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors shrink-0"
            >
              {open ? (
                <>Hide comment <ChevronUp className="size-3" /></>
              ) : (
                <>View comment <ChevronDown className="size-3" /></>
              )}
            </button>
          )}
        </div>

        {comment && open && (
          <p className="text-sm text-zinc-400 border-l-2 border-zinc-700 pl-3 py-0.5">
            {comment}
          </p>
        )}
      </div>
    </div>
  )
}

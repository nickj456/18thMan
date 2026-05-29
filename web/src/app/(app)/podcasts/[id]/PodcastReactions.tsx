'use client'

import { useState, useTransition } from 'react'
import { togglePodcastReaction } from '@/app/(app)/podcasts/actions'
import { ThumbsUp, Heart } from 'lucide-react'

interface PodcastReactionsProps {
  podcastId: string
  initialCounts: { like: number; love: number }
  userReaction: 'like' | 'love' | null
}

export function PodcastReactions({ podcastId, initialCounts, userReaction: initialUserReaction }: PodcastReactionsProps) {
  const [counts, setCounts] = useState(initialCounts)
  const [userReaction, setUserReaction] = useState<'like' | 'love' | null>(initialUserReaction)
  const [, startTransition] = useTransition()

  function handleReact(reaction: 'like' | 'love') {
    // Optimistic update
    const prev = { counts: { ...counts }, userReaction }

    setCounts(c => {
      const next = { ...c }
      if (userReaction === reaction) {
        // Remove reaction
        next[reaction] = Math.max(0, next[reaction] - 1)
      } else {
        // Add new reaction, remove old if switching
        if (userReaction) next[userReaction] = Math.max(0, next[userReaction] - 1)
        next[reaction] = next[reaction] + 1
      }
      return next
    })
    setUserReaction(userReaction === reaction ? null : reaction)

    startTransition(async () => {
      const result = await togglePodcastReaction(podcastId, reaction)
      if (result?.error) {
        // Revert
        setCounts(prev.counts)
        setUserReaction(prev.userReaction)
      }
    })
  }

  const buttons: { reaction: 'like' | 'love'; Icon: typeof ThumbsUp; label: string }[] = [
    { reaction: 'like', Icon: ThumbsUp, label: 'Like' },
    { reaction: 'love', Icon: Heart, label: 'Love' },
  ]

  return (
    <div className="flex items-center gap-2">
      {buttons.map(({ reaction, Icon, label }) => {
        const count = counts[reaction]
        const active = userReaction === reaction
        return (
          <button
            key={reaction}
            onClick={() => handleReact(reaction)}
            className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? 'border-[#e8560a]/60 bg-[#e8560a]/10 text-[#e8560a]'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
            }`}
            aria-label={`${label}: ${count}`}
          >
            <Icon className={`size-4 ${active ? 'fill-current' : ''}`} />
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

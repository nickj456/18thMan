'use client'

import { useState, useTransition } from 'react'
import { togglePodcastSave } from '@/app/(app)/podcasts/actions'
import { Bookmark } from 'lucide-react'

interface PodcastSaveButtonProps {
  podcastId: string
  initialSaved: boolean
}

export function PodcastSaveButton({ podcastId, initialSaved }: PodcastSaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [, startTransition] = useTransition()

  function handleToggle() {
    setSaved(s => !s)
    startTransition(async () => {
      const result = await togglePodcastSave(podcastId)
      if (result?.error) setSaved(saved) // revert on error
    })
  }

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        saved
          ? 'border-zinc-500 bg-zinc-700/50 text-zinc-200'
          : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
      }`}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
    >
      <Bookmark className={`size-4 ${saved ? 'fill-current' : ''}`} />
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}

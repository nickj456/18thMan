'use client'

import { useState } from 'react'
import { PlayCircle } from 'lucide-react'
import { VideoModal } from '@/components/drills/VideoModal'

interface DrillCardPlayButtonProps {
  videoId: string
  title: string
}

export function DrillCardPlayButton({ videoId, title }: DrillCardPlayButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Play video: ${title}`}
      >
        <div className="rounded-full bg-black/60 p-2 backdrop-blur-sm">
          <PlayCircle size={40} className="text-white" />
        </div>
      </button>
      <VideoModal
        videoId={videoId}
        title={title}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

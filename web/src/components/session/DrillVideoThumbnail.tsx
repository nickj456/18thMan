'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface DrillVideoThumbnailProps {
  title: string
  youtubeUrl: string | null
  thumbnailUrl: string | null
  width?: number
  height?: number
  className?: string
}

export function DrillVideoThumbnail({
  title,
  youtubeUrl,
  thumbnailUrl,
  className = '',
}: DrillVideoThumbnailProps) {
  const [open, setOpen] = useState(false)

  const videoId = youtubeUrl ? extractVideoId(youtubeUrl) : null
  const thumb = thumbnailUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null)

  return (
    <>
      <div
        className={`relative overflow-hidden bg-zinc-800 ${className} ${videoId ? 'cursor-pointer group' : ''}`}
        onClick={() => videoId && setOpen(true)}
      >
        {thumb && (
          <Image src={thumb} alt={title} fill className="object-cover" />
        )}
        {videoId && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play size={16} className="text-zinc-900 ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {videoId && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-zinc-800">
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

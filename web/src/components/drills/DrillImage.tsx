'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff, Play, PlayCircle } from 'lucide-react'
import { VideoModal } from '@/components/drills/VideoModal'
import { DrillAnimationModal } from '@/components/drills/DrillAnimationModal'
import type { CanvasState } from '@/components/designer/types'

interface DrillImageProps {
  youtubeThumbnail: string | null
  canvasPreview: string | null
  alt: string
  videoId?: string | null
  canvasJson?: CanvasState | null
}

function getFallback(src: string): string | null {
  const maxres = src.match(/img\.youtube\.com\/vi\/([^/]+)\/maxresdefault\.jpg/)
  if (maxres) return `https://img.youtube.com/vi/${maxres[1]}/hqdefault.jpg`
  return null
}

function SingleImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src)
  const [failed, setFailed] = useState(false)

  function handleError() {
    const fallback = getFallback(imgSrc)
    if (fallback && fallback !== imgSrc) setImgSrc(fallback)
    else setFailed(true)
  }

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600">
        <ImageOff size={32} />
        <span className="text-xs">Preview unavailable</span>
      </div>
    )
  }
  return <Image src={imgSrc} alt={alt} fill className="object-cover" onError={handleError} />
}

export function DrillImage({ youtubeThumbnail, canvasPreview, alt, videoId, canvasJson }: DrillImageProps) {
  const hasBoth = !!youtubeThumbnail && !!canvasPreview
  const [active, setActive] = useState<'youtube' | 'canvas'>(youtubeThumbnail ? 'youtube' : 'canvas')
  const [videoOpen, setVideoOpen] = useState(false)
  const [animOpen, setAnimOpen] = useState(false)

  const hasAnimation = !!(canvasJson?.keyframes && canvasJson.keyframes.length >= 2)
  const src = active === 'youtube' ? youtubeThumbnail : canvasPreview
  if (!src) return null

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group">
        <SingleImage src={src} alt={alt} />

        {/* YouTube play button */}
        {videoId && active === 'youtube' && (
          <button
            onClick={() => setVideoOpen(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Play video"
          >
            <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm">
              <PlayCircle size={52} className="text-white" />
            </div>
          </button>
        )}

        {/* Animation play button — shown when canvas view is active and drill has keyframes */}
        {active === 'canvas' && hasAnimation && (
          <button
            onClick={() => setAnimOpen(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Play animation"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-indigo-600/80 p-4 backdrop-blur-sm shadow-lg">
                <Play size={44} className="text-white fill-white" />
              </div>
              <span className="text-sm font-semibold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                Play Animation
              </span>
            </div>
          </button>
        )}
      </div>

      {videoId && (
        <VideoModal videoId={videoId} title={alt} open={videoOpen} onClose={() => setVideoOpen(false)} />
      )}
      {hasAnimation && canvasJson && animOpen && (
        <DrillAnimationModal canvasJson={canvasJson} drillTitle={alt} onClose={() => setAnimOpen(false)} />
      )}

      {hasBoth && (
        <div className="flex gap-2">
          <button
            onClick={() => setActive('youtube')}
            className={`relative h-14 w-24 rounded border overflow-hidden transition-all ${
              active === 'youtube' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-zinc-700 opacity-60 hover:opacity-100'
            }`}
          >
            <Image src={youtubeThumbnail!} alt="YouTube thumbnail" fill className="object-cover" />
          </button>
          <button
            onClick={() => { setActive('canvas'); if (hasAnimation) setAnimOpen(true) }}
            className={`relative h-14 w-24 rounded border overflow-hidden transition-all ${
              active === 'canvas' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-zinc-700 opacity-60 hover:opacity-100'
            }`}
          >
            <Image src={canvasPreview!} alt="Drill diagram" fill className="object-cover" />
            {/* Animated indicator on thumbnail strip */}
            {hasAnimation && (
              <div className="absolute bottom-1 right-1 rounded bg-indigo-600/80 p-0.5">
                <Play size={8} className="text-white fill-white" />
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

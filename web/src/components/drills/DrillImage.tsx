'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'

interface DrillImageProps {
  youtubeThumbnail: string | null
  canvasPreview: string | null
  alt: string
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

export function DrillImage({ youtubeThumbnail, canvasPreview, alt }: DrillImageProps) {
  const hasBoth = !!youtubeThumbnail && !!canvasPreview
  const [active, setActive] = useState<'youtube' | 'canvas'>(youtubeThumbnail ? 'youtube' : 'canvas')

  const src = active === 'youtube' ? youtubeThumbnail : canvasPreview
  if (!src) return null

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
        <SingleImage src={src} alt={alt} />
      </div>
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
            onClick={() => setActive('canvas')}
            className={`relative h-14 w-24 rounded border overflow-hidden transition-all ${
              active === 'canvas' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-zinc-700 opacity-60 hover:opacity-100'
            }`}
          >
            <Image src={canvasPreview!} alt="Drill diagram" fill className="object-cover" />
          </button>
        </div>
      )}
    </div>
  )
}

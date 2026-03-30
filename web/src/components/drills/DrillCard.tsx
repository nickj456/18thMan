'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Star, PlayCircle } from 'lucide-react'
import { VideoModal } from '@/components/drills/VideoModal'
import { extractYouTubeId } from '@/lib/youtube'
import type { DrillWithRelations } from '@/lib/supabase/types'

const difficultyColour: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  advanced: 'bg-red-500/15 text-red-400 border-red-500/20',
}

interface DrillCardProps {
  drill: DrillWithRelations
  avgRating?: number
}

export function DrillCard({ drill, avgRating }: DrillCardProps) {
  const [videoOpen, setVideoOpen] = useState(false)
  const videoId = drill.youtube_url ? extractYouTubeId(drill.youtube_url) : null

  return (
    <>
      <Card className="h-full overflow-hidden transition-colors hover:border-border/80 hover:bg-accent/5 group">
        {/* Thumbnail — click plays video if available, else navigates */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {drill.preview_image_url ? (
            <Image
              src={drill.preview_image_url}
              alt={drill.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl opacity-20">🏉</div>
            </div>
          )}

          {videoId ? (
            <button
              onClick={() => setVideoOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Play video: ${drill.title}`}
            >
              <div className="rounded-full bg-black/60 p-2 backdrop-blur-sm">
                <PlayCircle size={40} className="text-white" />
              </div>
            </button>
          ) : (
            <Link href={`/drills/${drill.id}`} className="absolute inset-0" aria-label={drill.title} />
          )}
        </div>

        {/* Card body navigates to detail */}
        <Link href={`/drills/${drill.id}`} className="block">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {drill.title}
            </h3>
            {drill.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{drill.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {drill.category && (
                <Badge variant="secondary" className="text-xs">{drill.category.name}</Badge>
              )}
              {drill.difficulty && (
                <Badge className={`text-xs border ${difficultyColour[drill.difficulty]}`}>
                  {drill.difficulty}
                </Badge>
              )}
              {videoId && (
                <Badge className="text-xs border bg-red-500/10 text-red-400 border-red-500/20">
                  ▶ Video
                </Badge>
              )}
            </div>
          </CardContent>

          <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {drill.player_count ?? 'Any'}
            </span>
            {avgRating !== undefined && (
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)}
              </span>
            )}
            {drill.age_group && <span>{drill.age_group}</span>}
          </CardFooter>
        </Link>
      </Card>

      {videoId && (
        <VideoModal
          videoId={videoId}
          title={drill.title}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </>
  )
}

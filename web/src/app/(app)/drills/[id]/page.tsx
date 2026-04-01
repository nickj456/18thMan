import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { SaveDrillButton } from '@/components/drills/SaveDrillButton'
import { DrillRatingForm } from '@/components/drills/DrillRatingForm'
import { AiGuideDisplay } from '@/components/drills/AiGuideDisplay'
import { RegenerateGuideButton } from '@/components/drills/RegenerateGuideButton'
import { DrillImage } from '@/components/drills/DrillImage'
import { extractYouTubeId } from '@/lib/youtube'
import { Star, Users, ArrowLeft, PenTool, Sparkles, Loader2 } from 'lucide-react'
import type { AiGuide } from '@/lib/supabase/types'

const difficultyColour: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  advanced: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default async function DrillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [drillResult, ratingsResult, profileResult] = await Promise.all([
    supabase
      .from('drills')
      .select(`*, canvas_preview_url, category:drill_categories(*), author:profiles!drills_author_id_fkey(id, username, display_name, avatar_url)`)
      .eq('id', id)
      .single(),
    supabase
      .from('drill_ratings')
      .select(`*, author:profiles!drills_author_id_fkey(id, username, display_name, avatar_url)`)
      .eq('drill_id', id)
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!drillResult.data) notFound()

  const drill = drillResult.data
  const ratings = ratingsResult.data ?? []
  const userRole = profileResult.data?.role ?? 'viewer'
  const canInteract = userRole !== 'viewer'

  // Check if user saved this drill
  const savedResult = user
    ? await supabase.from('drill_saves').select('drill_id').eq('drill_id', id).eq('user_id', user.id).single()
    : null
  const isSaved = !!savedResult?.data

  // User's existing rating
  const userRating = user ? ratings.find(r => r.user_id === user.id) : null

  // Average rating
  const avgRating = ratings.length
    ? ratings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratings.filter(r => r.rating).length
    : null

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/drills" />}>
          <ArrowLeft className="size-4 mr-1" />
          Drill Library
        </Button>
        <div className="flex gap-2">
          {canInteract && (
            <SaveDrillButton drillId={id} initialSaved={isSaved} />
          )}
          {(userRole === 'admin' || drill.author_id === user?.id) && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/drills/${id}/edit`} />}>
              <PenTool className="size-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Preview image(s) */}
      {(drill.preview_image_url || drill.canvas_preview_url) && (
        <DrillImage
          youtubeThumbnail={drill.preview_image_url}
          canvasPreview={drill.canvas_preview_url}
          alt={drill.title}
          videoId={drill.youtube_url ? extractYouTubeId(drill.youtube_url) : null}
        />
      )}

      {/* Header */}
      <div className="space-y-3">
        <h1 className="app-heading text-3xl">{drill.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {drill.category && <Badge variant="secondary">{drill.category.name}</Badge>}
          {drill.difficulty && (
            <Badge className={`border ${difficultyColour[drill.difficulty]}`}>
              {drill.difficulty}
            </Badge>
          )}
          {drill.age_group && <Badge variant="outline">{drill.age_group}</Badge>}
          {drill.player_count && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="size-4" />
              {drill.player_count} players
            </span>
          )}
          {avgRating && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {avgRating.toFixed(1)} ({ratings.length} rating{ratings.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="size-6">
            <AvatarImage src={drill.author?.avatar_url ?? ''} />
            <AvatarFallback className="text-xs">
              {drill.author?.display_name?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <span>by {drill.author?.display_name ?? drill.author?.username ?? 'Unknown'}</span>
        </div>
      </div>

      {/* Description */}
      {drill.description && (
        <p className="text-muted-foreground leading-relaxed">{drill.description}</p>
      )}

      {/* Video links */}
      {(drill.youtube_url || drill.tiktok_url || drill.facebook_url) && (
        <div className="flex flex-wrap gap-2">
          {drill.youtube_url && extractYouTubeId(drill.youtube_url) && (
            <a
              href={drill.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#FF0000] hover:bg-[#cc0000] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-white shrink-0">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-sm font-semibold text-white">Watch on YouTube</span>
            </a>
          )}
          {drill.tiktok_url && (
            <a
              href={drill.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-white shrink-0">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
              </svg>
              <span className="text-sm font-semibold text-white">Watch on TikTok</span>
            </a>
          )}
          {drill.facebook_url && (
            <a
              href={drill.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-white shrink-0">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm font-semibold text-white">Watch on Facebook</span>
            </a>
          )}
        </div>
      )}

      {/* AI Coaching Guide */}
      {drill.ai_guide ? (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <AiGuideDisplay guide={drill.ai_guide as AiGuide} />
          </div>
          {userRole === 'admin' && drill.youtube_url && (
            <div className="flex justify-end">
              <RegenerateGuideButton drillId={id} />
            </div>
          )}
        </>
      ) : drill.youtube_url ? (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <Loader2 className="size-4 animate-spin text-indigo-400" />
              <span>AI coaching guide is being generated — refresh in a moment.</span>
            </div>
            {userRole === 'admin' && (
              <RegenerateGuideButton drillId={id} />
            )}
          </div>
        </>
      ) : null}

      <Separator />

      {/* Ratings & comments */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">
          Ratings & Comments {ratings.length > 0 && `(${ratings.length})`}
        </h2>

        {canInteract && (
          <DrillRatingForm
            drillId={id}
            existingRating={userRating?.rating ?? undefined}
            existingComment={userRating?.comment ?? undefined}
          />
        )}

        {ratings.length > 0 && (
          <div className="space-y-4">
            {ratings.map(r => (
              <div key={r.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={r.author?.avatar_url ?? ''} />
                  <AvatarFallback className="text-xs">
                    {r.author?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {r.author?.display_name ?? r.author?.username}
                    </span>
                    {r.rating && (
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star
                            key={n}
                            className={`size-3 ${n <= r.rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {ratings.length === 0 && !canInteract && (
          <p className="text-sm text-muted-foreground">No ratings yet.</p>
        )}
      </div>
    </div>
  )
}

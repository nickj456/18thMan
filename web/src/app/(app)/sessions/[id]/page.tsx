import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, BookOpen, Users, Pencil, ArrowLeft } from 'lucide-react'
import { DeleteSessionButton } from '@/components/session/DeleteSessionButton'
import { SessionSummaryCard } from '@/components/session/SessionSummaryCard'
import { DrillVideoThumbnail } from '@/components/session/DrillVideoThumbnail'
import type { SessionPlan, SessionDrillItem, Drill } from '@/lib/supabase/types'
import type { SessionSummary } from '../actions'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('session_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const sessionPlan = session as SessionPlan & { ai_summary?: SessionSummary }
  const isOwner = sessionPlan.coach_id === user.id

  const drillIds = (sessionPlan.drills_order as SessionDrillItem[]).map(d => d.drill_id)
  const drillsMap = new Map<string, Drill>()

  if (drillIds.length > 0) {
    const { data: drills } = await supabase
      .from('drills')
      .select('id, title, description, preview_image_url, canvas_preview_url, difficulty, youtube_url')
      .in('id', drillIds)
    for (const drill of drills ?? []) drillsMap.set(drill.id, drill as Drill)
  }

  const hours = sessionPlan.total_duration ? Math.floor(sessionPlan.total_duration / 60) : 0
  const mins = sessionPlan.total_duration ? sessionPlan.total_duration % 60 : 0
  const durationLabel = sessionPlan.total_duration
    ? hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Sessions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="app-heading text-2xl">{sessionPlan.title}</h1>
            {sessionPlan.is_shared && (
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-400">
                <Users size={11} className="mr-1" />
                Shared
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen size={13} />
              {drillIds.length} drill{drillIds.length !== 1 ? 's' : ''}
            </span>
            {durationLabel && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {durationLabel}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/sessions/${id}/edit`} />}>
              <Pencil size={13} className="mr-1.5" />
              Edit
            </Button>
            <DeleteSessionButton sessionId={id} />
          </div>
        )}
      </div>

      <Separator className="bg-zinc-800" />

      {/* AI Summary */}
      <SessionSummaryCard
        sessionId={id}
        summary={sessionPlan.ai_summary ?? null}
        isOwner={isOwner}
      />

      {/* Drill list */}
      {drillIds.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No drills in this session.</p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Drills ({drillIds.length})
          </h2>
          <ol className="space-y-3">
            {(sessionPlan.drills_order as SessionDrillItem[]).map((item, index) => {
              const drill = drillsMap.get(item.drill_id)
              if (!drill) return null
              return (
                <li key={`${item.drill_id}-${index}`} className="flex gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 mt-0.5">
                    {index + 1}
                  </div>
                  <DrillVideoThumbnail
                    title={drill.title}
                    youtubeUrl={drill.youtube_url ?? null}
                    thumbnailUrl={drill.canvas_preview_url ?? drill.preview_image_url ?? null}
                    className="w-20 h-14 rounded-lg flex-shrink-0 self-start"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/drills/${drill.id}`}
                        className="font-semibold text-sm hover:text-indigo-400 transition-colors"
                      >
                        {drill.title}
                      </Link>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Clock size={11} />
                        {item.duration_minutes}min
                      </span>
                    </div>
                    {drill.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{drill.description}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-2 mt-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

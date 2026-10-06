import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DrillDesigner } from '@/components/designer/DrillDesigner'
import { hasClubAccess, getEffectiveTierCached } from '@/lib/subscription'
import type { DrillCategory } from '@/lib/supabase/types'
import type { CanvasState } from '@/components/designer/types'

export default async function EditDrillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [drillResult, categoriesResult, profileResult] = await Promise.all([
    supabase
      .from('drills')
      .select('id, title, description, category_id, difficulty, age_group, player_count, canvas_json, youtube_url, tiktok_url, facebook_url, preview_image_url, canvas_preview_url, author_id, is_public, club_id')
      .eq('id', id)
      .single(),
    supabase.from('drill_categories').select('*').order('sort_order'),
    supabase.from('profiles').select('role, club_id').eq('id', user.id).single(),
  ])

  if (!drillResult.data) notFound()

  const drill = drillResult.data
  const userRole = profileResult.data?.role ?? 'viewer'
  const canEdit = drill.author_id === user.id || userRole === 'admin'
  if (!canEdit) redirect(`/drills/${id}`)

  const categories = (categoriesResult.data ?? []) as DrillCategory[]

  const userClubId = profileResult.data?.club_id ?? null
  let userClubName: string | null = null
  if (userClubId) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', userClubId).single()
    userClubName = club?.name ?? null
  }
  const tier = await getEffectiveTierCached(user.id)

  return (
    <div className="-m-6 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
        <Link
          href={`/drills/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to drill
        </Link>
        <span aria-hidden className="text-muted-foreground/50">/</span>
        <h1 className="app-heading min-w-0 truncate text-base leading-none">{drill.title}</h1>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          Editing
        </span>
      </header>
      <div className="flex-1 overflow-hidden">
        <DrillDesigner
          categories={categories}
          userClubId={userClubId}
          userClubName={userClubName}
          hasClubAccess={hasClubAccess(tier)}
          initialDrill={{
            id: drill.id,
            title: drill.title,
            description: drill.description,
            category_id: drill.category_id,
            difficulty: drill.difficulty,
            age_group: drill.age_group,
            player_count: drill.player_count,
            canvas_json: drill.canvas_json as CanvasState | null,
            youtube_url: drill.youtube_url,
            tiktok_url: drill.tiktok_url,
            facebook_url: drill.facebook_url,
            preview_image_url: drill.preview_image_url,
            canvas_preview_url: drill.canvas_preview_url,
            is_public: drill.is_public,
            club_id: drill.club_id,
          }}
        />
      </div>
    </div>
  )
}
